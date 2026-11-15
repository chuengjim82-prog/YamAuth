using System.Data;
using System.Reflection;
using System.Text.Json;
using FreeSql.DataAnnotations;
using Microsoft.Data.SqlClient;
using YamAuth.Authorization;
using YamAuth.Entity.Abstractions;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Entity.YamBase.Unit;
using YamAuth.Entity.YamBzss.Bzss;

namespace YamAuth.Migrations;

/// <summary>独立维护窗口工具；DDL、映射、约束、首批授权和审计在同一数据库事务中提交。</summary>
public sealed class MigrationRunner : IAsyncDisposable
{
    readonly SqlConnection connection;
    SqlTransaction? transaction;
    public MigrationRunner(string connectionString)
    {
        var builder = new SqlConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(builder.InitialCatalog) || builder.InitialCatalog is "master" or "model" or "msdb" or "tempdb")
            throw new InvalidOperationException("必须显式指定业务或专用测试数据库");
        connection = new SqlConnection(connectionString);
    }
    public string Database => connection.Database;
    async Task OpenAsync() { if (connection.State != ConnectionState.Open) await connection.OpenAsync(); }
    SqlCommand Command(string sql, object? parameters = null)
    {
        var command = connection.CreateCommand(); command.Transaction = transaction; command.CommandText = sql; command.CommandTimeout = 120;
        if (parameters != null)
            foreach (var property in parameters.GetType().GetProperties()) command.Parameters.AddWithValue("@" + property.Name, property.GetValue(parameters) ?? DBNull.Value);
        return command;
    }
    async Task<int> ExecuteAsync(string sql, object? parameters = null)
    { await OpenAsync(); await using var command = Command(sql, parameters); return await command.ExecuteNonQueryAsync(); }
    async Task<T> ScalarAsync<T>(string sql, object? parameters = null)
    {
        await OpenAsync(); await using var command = Command(sql, parameters); var result = await command.ExecuteScalarAsync();
        return result is null or DBNull ? default! : (T)Convert.ChangeType(result, typeof(T));
    }
    static string Table<T>() => typeof(T).GetCustomAttribute<TableAttribute>()!.Name;
    static PropertyInfo[] Columns<T>() => typeof(T).GetProperties().Where(x => x.GetCustomAttribute<ColumnAttribute>()?.IsIgnore != true).ToArray();
    async Task<List<T>> RowsAsync<T>(string sql, object? parameters = null) where T : new()
    {
        await OpenAsync(); await using var command = Command(sql, parameters); await using var reader = await command.ExecuteReaderAsync();
        var properties = typeof(T).GetProperties().ToDictionary(x => x.Name, StringComparer.OrdinalIgnoreCase); var result = new List<T>();
        while (await reader.ReadAsync())
        {
            var row = new T();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (!properties.TryGetValue(reader.GetName(i), out var property) || reader.IsDBNull(i)) continue;
                property.SetValue(row, reader.GetValue(i));
            }
            result.Add(row);
        }
        return result;
    }
    async Task<T> GetAsync<T>(long id) where T : IAuditEntity, new() =>
        (await RowsAsync<T>($"SELECT * FROM dbo.[{Table<T>()}] WHERE Id=@id AND IsDeleted=0", new { id })).SingleOrDefault()
            ?? throw new InvalidOperationException($"映射对象不存在：{typeof(T).Name} #{id}");
    async Task<long> InsertAsync<T>(T entity) where T : IAuditEntity
    {
        entity.CreateTime = DateTime.UtcNow; entity.CreatorNic = "权限迁移";
        var properties = Columns<T>().Where(x => x.Name is not ("Id" or "RowVersion")).ToArray();
        var sql = $"INSERT dbo.[{Table<T>()}] ({string.Join(",", properties.Select(x => "[" + x.Name + "]"))}) OUTPUT INSERTED.Id VALUES ({string.Join(",", properties.Select(x => "@" + x.Name))})";
        await using var command = Command(sql);
        foreach (var property in properties) command.Parameters.AddWithValue("@" + property.Name, property.GetValue(entity) ?? DBNull.Value);
        entity.Id = Convert.ToInt64(await command.ExecuteScalarAsync()); return entity.Id;
    }
    async Task UpdateAsync<T>(T entity) where T : IAuditEntity
    {
        entity.UpdaterNic = "权限迁移"; entity.UpdateTime = DateTime.UtcNow;
        var properties = Columns<T>().Where(x => x.Name is not ("Id" or "RowVersion")).ToArray();
        await using var command = Command($"UPDATE dbo.[{Table<T>()}] SET {string.Join(",", properties.Select(x => "[" + x.Name + "]=@" + x.Name))} WHERE Id=@Id");
        command.Parameters.AddWithValue("@Id", entity.Id);
        foreach (var property in properties) command.Parameters.AddWithValue("@" + property.Name, property.GetValue(entity) ?? DBNull.Value);
        await command.ExecuteNonQueryAsync();
    }
    async Task<bool> HasTableAsync(string table) => await ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables WHERE name=@table AND schema_id=SCHEMA_ID('dbo')", new { table }) == 1;
    async Task<bool> HasColumnAsync(string table, string column) => await ScalarAsync<int>("SELECT CASE WHEN COL_LENGTH(@table,@column) IS NULL THEN 0 ELSE 1 END", new { table = "dbo." + table, column }) == 1;
    async Task ScriptAsync(string name)
    {
        using var resource = typeof(MigrationRunner).Assembly.GetManifestResourceStream("YamAuth.Migrations.Sql." + name)
            ?? throw new InvalidOperationException("迁移 SQL 不存在");
        using var reader = new StreamReader(resource); await ExecuteAsync(await reader.ReadToEndAsync());
    }

    public async Task InitializeTestDatabaseAsync()
    {
        await OpenAsync();
        if (!connection.Database.StartsWith("YamAuth_Test_", StringComparison.Ordinal) || connection.Database.Length <= "YamAuth_Test_".Length)
            throw new InvalidOperationException("test-init 仅允许名称以 YamAuth_Test_ 开头的专用测试库");
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0") != 0)
            throw new InvalidOperationException("test-init 只允许空库，不覆盖已有表或账号");
        transaction = (SqlTransaction)await connection.BeginTransactionAsync(IsolationLevel.Serializable);
        try { await ScriptAsync("TestBaseline.sql"); await transaction.CommitAsync(); }
        catch { await transaction.RollbackAsync(); throw; }
        finally { await transaction.DisposeAsync(); transaction = null; }
    }

    public async Task ApplyAsync(MigrationManifest manifest, string manifestHash)
    {
        await OpenAsync();
        if (!string.Equals(manifest.Database, connection.Database, StringComparison.Ordinal)) throw new InvalidOperationException("映射文件数据库名与连接目标不一致");
        if (manifest.Users.Count == 0 || !manifest.Users.Any(x => x.PlatformAdministrator)) throw new InvalidOperationException("必须显式确认至少一位平台管理员");
        if (manifest.Users.Select(x => x.Id).Distinct().Count() != manifest.Users.Count
            || manifest.Employees.Select(x => x.Id).Distinct().Count() != manifest.Employees.Count
            || manifest.Owners.Select(x => (x.Resource, x.Id)).Distinct().Count() != manifest.Owners.Count
            || manifest.Roles.Select(x => x.Id).Distinct().Count() != manifest.Roles.Count)
            throw new InvalidOperationException("映射清单包含重复记录");
        transaction = (SqlTransaction)await connection.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            await ExecuteAsync("DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=N'YamAuth.AuthorizationMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=0; IF @result<0 THROW 51000,N'另一个迁移正在执行',1;");
            if (await HasTableAsync("tb_Auth_SchemaVersion") && await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_SchemaVersion WHERE Version=1") > 0)
            {
                if (await ScalarAsync<string>("SELECT ManifestHash FROM dbo.tb_Auth_SchemaVersion WHERE Version=1") != manifestHash)
                    throw new InvalidOperationException("已完成初始迁移，不能用另一份清单覆盖；后续调整请使用专用管理接口或新增迁移版本");
                await VerifyAsync(); await transaction.CommitAsync(); return;
            }
            foreach (var resource in ResourceSecurityCatalog.Resources)
                if (!await HasTableAsync(resource.Table)) throw new InvalidOperationException($"缺少基线表 {resource.Table}，请核对数据库模型");
            await ScriptAsync("001-authorization.sql");
            var backend = await SeedCatalogAsync();
            foreach (var mapping in manifest.Users) await MapUserAsync(mapping);
            foreach (var mapping in manifest.Apps)
            {
                await TenantAsync(mapping.TenantId);
                var app = await GetAsync<AppsInfo>(mapping.Id);
                if (app.Id == backend) throw new InvalidOperationException("内置应用不能映射为租户应用");
                app.TenantId = mapping.TenantId; app.AppKind = ResourceSecurityCatalog.TenantAppKind; await UpdateAsync(app);
            }
            foreach (var mapping in manifest.Departments)
            {
                await TenantAsync(mapping.TenantId); var department = await GetAsync<Department>(mapping.Id);
                department.TenantId = mapping.TenantId; await UpdateAsync(department);
            }
            foreach (var mapping in manifest.Employees)
            {
                await TenantAsync(mapping.TenantId);
                if (mapping.UserId is long user) await TenantUserAsync(user, mapping.TenantId);
                if (mapping.DepartmentId is long department) await DepartmentAsync(department, mapping.TenantId);
                var employee = await GetAsync<Employee>(mapping.Id); employee.TenantId = mapping.TenantId;
                employee.UserId = mapping.UserId; employee.DepartmentId = mapping.DepartmentId; employee.OwnershipConfirmed = true; await UpdateAsync(employee);
            }
            foreach (var mapping in manifest.Owners)
            {
                await TenantUserAsync(mapping.OwnerUserId, mapping.TenantId);
                if (mapping.OwnerDepartmentId is long department) await DepartmentAsync(department, mapping.TenantId);
                if (mapping.Resource == "bzss.companies")
                { var entity = await GetAsync<Company>(mapping.Id); entity.TenantId = mapping.TenantId; entity.OwnerUserId = mapping.OwnerUserId; entity.OwnerDepartmentId = mapping.OwnerDepartmentId; entity.OwnershipConfirmed = true; await UpdateAsync(entity); }
                else if (mapping.Resource == "bzss.projects")
                { var entity = await GetAsync<Project>(mapping.Id); entity.TenantId = mapping.TenantId; entity.OwnerUserId = mapping.OwnerUserId; entity.OwnerDepartmentId = mapping.OwnerDepartmentId; entity.OwnershipConfirmed = true; await UpdateAsync(entity); }
                else throw new InvalidOperationException("未知业务归属资源：" + mapping.Resource);
            }
            foreach (var mapping in manifest.Users.Where(x => x.TenantAdministrator))
            {
                var tenant = mapping.TenantId!.Value;
                var role = (await RowsAsync<CrudRole>("SELECT * FROM dbo.tb_Auth_CrudRole WHERE IsDeleted=0 AND TenantId=@tenant AND AppsId=@backend AND RoleKind=N'TenantAdministrator'", new { tenant, backend })).SingleOrDefault();
                if (role == null) { role = new CrudRole { TenantId = tenant, AppsId = backend, RoleCode = "tenant-administrator", RoleName = "租户管理员", IsSystem = true, RoleKind = ResourceSecurityCatalog.TenantAdministrator }; await InsertAsync(role); }
                await InsertAsync(new CrudRoleUser { TenantId = tenant, AppsId = backend, RoleId = role.Id, UserId = mapping.Id });
            }
            foreach (var mapping in manifest.Roles) await MapRoleAsync(mapping, backend);
            await ScriptAsync("002-constraints.sql");
            await ExecuteAsync("INSERT dbo.tb_Auth_SchemaVersion(Version,AppliedAt,ManifestHash) VALUES(1,SYSUTCDATETIME(),@manifestHash)", new { manifestHash });
            await VerifyAsync();
            var report = await InspectAsync();
            foreach (var issue in report.Issues)
                await ExecuteAsync("INSERT dbo.tb_Auth_MigrationIssue(Resource,RecordId,Reason) VALUES(@Resource,@Id,@Reason)", issue);
            await ExecuteAsync("INSERT dbo.tb_Auth_AuditEvent(Id,Action,TargetType,Result,CreatedAt,TraceId,Summary) VALUES(NEWID(),N'authorization.migrate',N'SchemaVersion',N'Allowed',SYSUTCDATETIME(),N'migration',@summary)",
                new { summary = JsonSerializer.Serialize(new { version = 1, manifestHash, quarantined = report.Issues.Count }) });
            await transaction.CommitAsync();
        }
        catch { await transaction.RollbackAsync(); throw; }
        finally { await transaction.DisposeAsync(); transaction = null; }
    }

    async Task MapUserAsync(UserMapping mapping)
    {
        if (mapping.PlatformAdministrator ? mapping.TenantId != null || mapping.TenantAdministrator : mapping.TenantId is not > 0)
            throw new InvalidOperationException($"账号 #{mapping.Id} 的平台身份与租户归属冲突");
        if (mapping.TenantId is long tenant) await TenantAsync(tenant);
        var user = await GetAsync<User>(mapping.Id);
        user.TenantId = mapping.TenantId; user.IsAdmin = mapping.PlatformAdministrator; user.SecurityReady = true; user.SecurityVersion++;
        user.UserName = user.UserName.Trim(); user.Email = user.Email.Trim().ToLowerInvariant();
        if (user.UserName.Length is 0 or > 128 || user.Email.Length is 0 or > 128) throw new InvalidOperationException($"账号 #{user.Id} 的登录标识长度无效");
        await UpdateAsync(user);
        var username = user.UserName.ToUpperInvariant(); var email = user.Email.ToUpperInvariant();
        foreach (var key in new[] { username, email }.Distinct())
        {
            if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_LoginIdentifier WHERE NormalizedValue=@key AND UserId<>@Id", new { key, user.Id }) > 0)
                throw new InvalidOperationException($"账号 #{user.Id} 存在跨账号用户名／邮箱冲突，迁移已中止");
            await ExecuteAsync("INSERT dbo.tb_Auth_LoginIdentifier(NormalizedValue,UserId,IsUserName,IsEmail) VALUES(@key,@Id,@isUserName,@isEmail)", new { key, user.Id, isUserName = key == username, isEmail = key == email });
        }
    }
    async Task TenantAsync(long tenantId)
    { if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_Tenant WHERE Id=@tenantId AND IsDeleted=0", new { tenantId }) != 1) throw new InvalidOperationException($"租户 #{tenantId} 不存在"); }
    async Task TenantUserAsync(long userId, long tenantId)
    {
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_User WHERE Id=@userId AND TenantId=@tenantId AND IsAdmin=0 AND SecurityReady=1 AND IsDeleted=0", new { userId, tenantId }) != 1)
            throw new InvalidOperationException($"用户 #{userId} 未明确映射到租户 #{tenantId}");
    }
    async Task DepartmentAsync(long departmentId, long tenantId)
    {
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Unit_Department WHERE Id=@departmentId AND TenantId=@tenantId AND IsDeleted=0", new { departmentId, tenantId }) != 1)
            throw new InvalidOperationException($"部门 #{departmentId} 不属于租户 #{tenantId}");
    }
    async Task MapRoleAsync(RoleMapping mapping, long backend)
    {
        await TenantAsync(mapping.TenantId);
        var appId = mapping.AppsId ?? backend;
        var app = await GetAsync<AppsInfo>(appId);
        if (appId != backend && (app.AppKind != ResourceSecurityCatalog.TenantAppKind || app.TenantId != mapping.TenantId)) throw new InvalidOperationException("角色应用没有映射到同一租户");
        var role = await GetAsync<CrudRole>(mapping.Id); role.TenantId = mapping.TenantId; role.AppsId = appId; role.RoleKind = ResourceSecurityCatalog.BusinessRole; role.IsSystem = false; await UpdateAsync(role);
        if (mapping.Grants.Select(x => x.Permission).Distinct().Count() != mapping.Grants.Count || mapping.UserIds.Distinct().Count() != mapping.UserIds.Count) throw new InvalidOperationException("角色映射包含重复授权或成员");
        foreach (var grant in mapping.Grants)
        {
            if (appId == backend) ResourceSecurityCatalog.ValidateGrant(grant.Permission, grant.ScopeType, grant.DepartmentIds);
            else throw new InvalidOperationException("外部应用历史权限须通过平台外部应用维护入口重新确认；初始清单仅映射内置后台操作");
            var info = (await RowsAsync<CrudInfo>("SELECT * FROM dbo.tb_Auth_CrudInfo WHERE IsDeleted=0 AND AppsId=@appId AND CrudCode=@permission AND NodeType=N'Operation'", new { appId, permission = grant.Permission })).Single();
            var link = new CrudRoleCrud { TenantId = mapping.TenantId, AppsId = appId, CrudRoleId = role.Id, CrudInfoId = info.Id, ScopeType = grant.ScopeType.ToString() }; await InsertAsync(link);
            foreach (var department in grant.DepartmentIds)
            {
                await DepartmentAsync(department, mapping.TenantId);
                await ExecuteAsync("INSERT dbo.tb_Auth_GrantDepartment(GrantId,DepartmentId,TenantId) VALUES(@Id,@department,@TenantId)", new { link.Id, department, mapping.TenantId });
            }
        }
        foreach (var user in mapping.UserIds)
        {
            await TenantUserAsync(user, mapping.TenantId);
            await InsertAsync(new CrudRoleUser { TenantId = mapping.TenantId, AppsId = appId, RoleId = role.Id, UserId = user });
        }
    }
    async Task<long> SeedCatalogAsync()
    {
        var backend = (await RowsAsync<AppsInfo>("SELECT * FROM dbo.tb_Auth_AppsInfo WHERE IsDeleted=0 AND AppKind=N'Backend'")).SingleOrDefault();
        if (backend == null)
        {
            backend = new AppsInfo { AppsCode = ResourceSecurityCatalog.BackendCode, AppsName = "YamAuth 后台", AppKind = ResourceSecurityCatalog.BackendKind,
                AppKey = Guid.NewGuid().ToString("N"), AppSecret = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)) };
            await InsertAsync(backend);
        }
        foreach (var resource in ResourceSecurityCatalog.Resources)
        {
            var directory = new CrudInfo { AppsId = backend.Id, CrudCode = resource.Key, CrudName = resource.Name, NodeType = "Directory", ResourceKey = resource.Key };
            await InsertAsync(directory);
            foreach (var permission in ResourceSecurityCatalog.Permissions.Where(x => x.Resource == resource))
            {
                var info = new CrudInfo { AppsId = backend.Id, ParentId = directory.Id, CrudCode = permission.Code, CrudName = permission.Name,
                    NodeType = "Operation", ResourceKey = resource.Key, OperationCode = permission.Action };
                await InsertAsync(info);
                if (permission.Action == "read" && resource.Key is not ("auth.crud-role-cruds" or "auth.crud-role-users" or "auth.data-roles" or "auth.data-role-users"))
                    await InsertAsync(new CrudMenu { AppsId = backend.Id, CrudId = info.Id, MenuCode = resource.Key, MenuName = resource.Name + "管理", MenuType = "menu",
                        RoutePath = "/" + resource.Key.Replace('.', '/'), IconName = "AppstoreOutlined", AllowAny = false });
            }
        }
        return backend.Id;
    }

    public async Task<InspectionReport> InspectAsync()
    {
        await OpenAsync(); var counts = new Dictionary<string, long>(); var issues = new List<InspectionIssue>();
        foreach (var resource in ResourceSecurityCatalog.Resources)
        {
            if (!await HasTableAsync(resource.Table)) { issues.Add(new(resource.Key, 0, "缺少基线表")); continue; }
            counts[resource.Key] = await ScalarAsync<long>($"SELECT COUNT_BIG(*) FROM dbo.[{resource.Table}] WHERE IsDeleted=0");
            string? condition = resource.Entity switch
            {
                "User" => await HasColumnAsync(resource.Table, "SecurityReady") ? "SecurityReady=0" : "1=1",
                "Employee" or "Company" or "Project" => await HasColumnAsync(resource.Table, "OwnershipConfirmed") ? "OwnershipConfirmed=0" : "1=1",
                "AppsInfo" => await HasColumnAsync(resource.Table, "AppKind") ? "AppKind=N'Unclassified'" : "1=1",
                "CrudRole" => await HasColumnAsync(resource.Table, "RoleKind") ? "RoleKind=N'Unclassified'" : "1=1",
                "CrudRoleUser" or "CrudRoleCrud" => await HasColumnAsync(resource.Table, "TenantId") ? "TenantId IS NULL OR AppsId IS NULL" : "1=1",
                "DataRole" or "DataRoleUser" => "1=1",
                "CrudInfo" => await HasColumnAsync(resource.Table, "NodeType") ? "NodeType=N'Unclassified'" : "1=1",
                "CrudMenu" => await HasColumnAsync(resource.Table, "AppsId") ? "AppsId IS NULL" : "1=1",
                _ => null
            };
            if (condition != null)
            {
                await using var command = Command($"SELECT Id FROM dbo.[{resource.Table}] WHERE IsDeleted=0 AND ({condition})"); await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync()) issues.Add(new(resource.Key, reader.GetInt64(0), "尚未确认归属、身份或操作映射；不参与内置后台授权"));
            }
        }
        if (await HasTableAsync("tb_Auth_User"))
        {
            var users = await RowsAsync<User>("SELECT Id,UserName,Email,TenantId,IsAdmin FROM dbo.tb_Auth_User WHERE IsDeleted=0");
            foreach (var group in users.SelectMany(x => new[] { (Key: x.UserName.Trim().ToUpperInvariant(), x.Id), (Key: x.Email.Trim().ToUpperInvariant(), x.Id) }).GroupBy(x => x.Key).Where(x => x.Select(y => y.Id).Distinct().Count() > 1))
                foreach (var id in group.Select(x => x.Id).Distinct()) issues.Add(new("auth.users", id, "用户名／邮箱存在跨账号歧义"));
        }
        return new(connection.Database, counts, issues, await HasTableAsync("tb_Auth_SchemaVersion") && await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_SchemaVersion WHERE Version=1") == 1);
    }

    public async Task VerifyAsync()
    {
        if (!await HasTableAsync("tb_Auth_SchemaVersion") || await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_SchemaVersion WHERE Version=1") != 1) throw new InvalidOperationException("授权迁移尚未完成");
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_AppsInfo WHERE IsDeleted=0 AND AppKind=N'Backend' AND AppsCode=N'yamauth.backend'") != 1) throw new InvalidOperationException("内置后台应用必须唯一");
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_User WHERE IsDeleted=0 AND SecurityReady=1 AND IsAdmin=1 AND IsActived=1 AND TenantId IS NULL") == 0) throw new InvalidOperationException("缺少有效平台管理员");
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_User u WHERE u.IsDeleted=0 AND u.SecurityReady=1 AND (NOT EXISTS(SELECT 1 FROM dbo.tb_Auth_LoginIdentifier i WHERE i.UserId=u.Id AND i.IsUserName=1) OR NOT EXISTS(SELECT 1 FROM dbo.tb_Auth_LoginIdentifier i WHERE i.UserId=u.Id AND i.IsEmail=1))") != 0) throw new InvalidOperationException("有效账号缺少统一登录标识");
        if (await ScalarAsync<int>("SELECT COUNT(*) FROM dbo.tb_Auth_Tenant t WHERE t.IsDeleted=0 AND t.IsActived=1 AND EXISTS(SELECT 1 FROM dbo.tb_Auth_User u WHERE u.TenantId=t.Id AND u.SecurityReady=1 AND u.IsDeleted=0) AND NOT EXISTS(SELECT 1 FROM dbo.tb_Auth_User u JOIN dbo.tb_Auth_CrudRoleUser ru ON ru.UserId=u.Id AND ru.TenantId=t.Id JOIN dbo.tb_Auth_CrudRole r ON r.Id=ru.RoleId AND r.TenantId=t.Id AND r.AppsId=ru.AppsId JOIN dbo.tb_Auth_AppsInfo a ON a.Id=r.AppsId AND a.AppKind=N'Backend' WHERE u.TenantId=t.Id AND u.SecurityReady=1 AND u.IsDeleted=0 AND u.IsActived=1 AND ru.IsDeleted=0 AND r.IsDeleted=0 AND r.RoleKind=N'TenantAdministrator')") != 0) throw new InvalidOperationException("已有有效成员的启用租户缺少管理员");
        var constraints = await ScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys WHERE name IN (N'FK_EmployeeUserTenant',N'FK_GrantRoleTenantApp',N'FK_GrantInfoApp',N'FK_RoleUserRoleTenantApp',N'FK_CompanyOwner',N'FK_ProjectOwner') AND is_disabled=0 AND is_not_trusted=0");
        if (constraints != 6) throw new InvalidOperationException("关键租户关联约束缺失或未验证");
    }
    public async ValueTask DisposeAsync() { if (transaction != null) await transaction.DisposeAsync(); await connection.DisposeAsync(); }
}
