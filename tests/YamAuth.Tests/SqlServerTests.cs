using System.Data;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using YamAuth.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Migrations;
using YamAuth.Service.Abstractions;
using Xunit;

namespace YamAuth.Tests;

public sealed class SqlFactAttribute : FactAttribute
{
    public SqlFactAttribute() { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("YAMAUTH_TEST_SERVER"))) Skip = "未显式配置隔离 SQL Server；本次不执行数据库测试"; }
}
public sealed class SqlTheoryAttribute : TheoryAttribute
{
    public SqlTheoryAttribute() { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("YAMAUTH_TEST_SERVER"))) Skip = "未显式配置隔离 SQL Server；本次不执行数据库测试"; }
}

/// <summary>每个用例自行创建并删除 YamAuth_Test_GUID 数据库，绝不使用应用配置中的现有数据库。</summary>
public sealed class SqlDatabase : IAsyncDisposable
{
    readonly string name = "YamAuth_Test_" + Guid.NewGuid().ToString("N");
    readonly string master;
    public string Connection { get; }
    public MigrationManifest Manifest { get; private set; } = new();
    public SqlDatabase()
    {
        var source = Environment.GetEnvironmentVariable("YAMAUTH_TEST_SERVER") ?? throw new InvalidOperationException("缺少隔离测试连接");
        var builder = new SqlConnectionStringBuilder(source) { InitialCatalog = "master", TrustServerCertificate = true }; master = builder.ConnectionString;
        builder.InitialCatalog = name; Connection = builder.ConnectionString;
    }
    public async Task InitializeAsync(bool applyMigration = true)
    {
        await ExecuteOnAsync(master, $"CREATE DATABASE [{name}]");
        await using var runner = new MigrationRunner(Connection); await runner.InitializeTestDatabaseAsync();
        var (hash, salt) = PasswordHelper.Hash("Initial-pass123!");
        await ExecuteAsync("""
            SET IDENTITY_INSERT dbo.tb_Auth_Tenant ON;
            INSERT dbo.tb_Auth_Tenant(Id,TenantCode,TenantName,IsActived) VALUES(1,N'A',N'租户A',1),(2,N'B',N'租户B',1);
            SET IDENTITY_INSERT dbo.tb_Auth_Tenant OFF;
            SET IDENTITY_INSERT dbo.tb_Unit_Department ON;
            INSERT dbo.tb_Unit_Department(Id,TenantId,DeptName) VALUES(10,1,N'A部门'),(20,2,N'B部门');
            SET IDENTITY_INSERT dbo.tb_Unit_Department OFF;
            SET IDENTITY_INSERT dbo.tb_Auth_User ON;
            INSERT dbo.tb_Auth_User(Id,UserName,NickName,Email,Password,PwdSalt,IsActived,IsAdmin,TenantId)
            SELECT value,CONCAT(N'user',value),CONCAT(N'用户',value),CONCAT(N'user',value,N'@example.test'),@hash,@salt,1,1,NULL
            FROM STRING_SPLIT(N'1,2,3,4,5,6,7,8',N',');
            SET IDENTITY_INSERT dbo.tb_Auth_User OFF;
            SET IDENTITY_INSERT dbo.tb_Unit_Employee ON;
            INSERT dbo.tb_Unit_Employee(Id,UserId,DepartmentId) VALUES(101,3,10),(102,2,10),(201,5,20);
            SET IDENTITY_INSERT dbo.tb_Unit_Employee OFF;
            SET IDENTITY_INSERT dbo.tb_Bzss_Project ON;
            INSERT dbo.tb_Bzss_Project(Id,TenantId,ProjName) VALUES(101,1,N'A本人'),(102,1,N'A他人'),(201,2,N'B记录'),(999,1,N'未确认');
            SET IDENTITY_INSERT dbo.tb_Bzss_Project OFF;
            SET IDENTITY_INSERT dbo.tb_Bzss_Company ON;
            INSERT dbo.tb_Bzss_Company(Id,TenantId,NameCn) VALUES(501,1,N'A公司'),(502,2,N'B公司');
            SET IDENTITY_INSERT dbo.tb_Bzss_Company OFF;
            SET IDENTITY_INSERT dbo.tb_Auth_CrudRole ON;
            INSERT dbo.tb_Auth_CrudRole(Id,RoleCode,RoleName) VALUES(1,N'member',N'业务成员');
            SET IDENTITY_INSERT dbo.tb_Auth_CrudRole OFF;
            SET IDENTITY_INSERT dbo.tb_Auth_AppsInfo ON;
            INSERT dbo.tb_Auth_AppsInfo(Id,TenantId,AppsCode,AppsName) VALUES(1,1,N'appA',N'A外部应用'),(2,2,N'appB',N'B外部应用');
            SET IDENTITY_INSERT dbo.tb_Auth_AppsInfo OFF;
            """, new { hash, salt });
        Manifest = new MigrationManifest
        {
            Database = name,
            Users = [new(1, null, true, false), new(6, null, true, false), new(2, 1, false, true), new(7, 1, false, true), new(3, 1, false, false), new(4, 2, false, true), new(5, 2, false, false)],
            Employees = [new(101, 1, 3, 10), new(102, 1, 2, 10), new(201, 2, 5, 20)],
            Owners = [new("bzss.projects", 101, 1, 3, 10), new("bzss.projects", 102, 1, 2, 10), new("bzss.projects", 201, 2, 5, 20), new("bzss.companies", 501, 1, 3, 10), new("bzss.companies", 502, 2, 5, 20)],
            Apps = [new(1, 1), new(2, 2)],
            Roles = [new(1, 1, null, [new("bzss.projects.read", DataScopeType.TenantAll, []), new("bzss.projects.update", DataScopeType.Self, []), new("bzss.projects.delete", DataScopeType.Self, []), new("bzss.projects.transfer", DataScopeType.Self, []), new("bzss.projects.create", DataScopeType.Self, [])], [3])]
        };
        if (applyMigration) await runner.ApplyAsync(Manifest, "test-manifest-v1");
    }
    public Task ExecuteAsync(string sql, object? parameters = null) => ExecuteOnAsync(Connection, sql, parameters);
    static async Task ExecuteOnAsync(string connection, string sql, object? parameters = null)
    {
        await using var db = new SqlConnection(connection); await db.OpenAsync(); await using var command = db.CreateCommand(); command.CommandText = sql;
        if (parameters != null) foreach (var property in parameters.GetType().GetProperties()) command.Parameters.AddWithValue("@" + property.Name, property.GetValue(parameters) ?? DBNull.Value);
        await command.ExecuteNonQueryAsync();
    }
    public async Task<long> CountAsync(string sql)
    {
        await using var db = new SqlConnection(Connection); await db.OpenAsync(); await using var command = db.CreateCommand(); command.CommandText = sql; return Convert.ToInt64(await command.ExecuteScalarAsync());
    }
    public async ValueTask DisposeAsync()
    {
        SqlConnection.ClearAllPools();
        if (!name.StartsWith("YamAuth_Test_", StringComparison.Ordinal) || name.Length != 45) throw new InvalidOperationException("拒绝清理非测试数据库");
        await ExecuteOnAsync(master, $"IF DB_ID(N'{name}') IS NOT NULL BEGIN ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}]; END");
    }
}
public sealed class ApiFactory(string connection) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("IntegrationTests")
        .ConfigureAppConfiguration((_context, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        { ["Db:Base"] = connection, ["Db:Bzss"] = connection, ["Db:LogSql"] = "false", ["Jwt:SecretKey"] = "IntegrationTest-SecretKey-32Bytes!!!" }));
}
public sealed class SqlServerTests
{
    static async Task<JsonElement> Data(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var root = await response.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal(0, root.GetProperty("code").GetInt32()); return root.GetProperty("data").Clone();
    }
    static async Task<HttpClient> Login(ApiFactory factory, int id)
    {
        var client = factory.CreateClient(); var data = await Data(await client.PostAsJsonAsync("/api/v1/auth/login", new { userName = "user" + id, password = "Initial-pass123!" }));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", data.GetProperty("token").GetString()); return client;
    }
    static async Task<HttpResponseMessage> PutVersion(HttpClient client, string url, object body, string version)
    { using var request = new HttpRequestMessage(HttpMethod.Put, url) { Content = JsonContent.Create(body) }; request.Headers.TryAddWithoutValidation("If-Match", '"' + version + '"'); return await client.SendAsync(request); }

    [SqlFact]
    public async Task MigrationIsAtomicIdempotentAndQuarantinesUnmappedIdentities()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var runner = new MigrationRunner(db.Connection);
        var first = await runner.InspectAsync(); await runner.ApplyAsync(db.Manifest, "test-manifest-v1"); var second = await runner.InspectAsync();
        Assert.Equal(first.Counts.OrderBy(x => x.Key), second.Counts.OrderBy(x => x.Key)); Assert.Contains(second.Issues, x => x.Resource == "auth.users" && x.Id == 8);
        await runner.VerifyAsync(); Assert.Equal(0, await db.CountAsync("SELECT COUNT(*) FROM dbo.tb_Auth_User WHERE Id=8 AND SecurityReady=1"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => runner.ApplyAsync(db.Manifest, "another-manifest"));
    }
    [SqlFact]
    public async Task MigrationFailureRollsBackSchemaIdentityAndCatalog()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(applyMigration: false);
        await using var runner = new MigrationRunner(db.Connection);
        var before = await runner.InspectAsync();
        var originalRole = db.Manifest.Roles[0];
        // 在身份、归属和目录已写入后触发角色映射失败，验证事务不会留下半成品。
        db.Manifest.Roles[0] = originalRole with { Grants = [new("unknown.operation", DataScopeType.TenantAll, [])] };
        await Assert.ThrowsAnyAsync<Exception>(() => runner.ApplyAsync(db.Manifest, "invalid-role"));
        Assert.Equal(0, await db.CountAsync("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.tb_Auth_User') AND name=N'SecurityReady'"));
        Assert.Equal(0, await db.CountAsync("SELECT COUNT(*) FROM sys.tables WHERE name IN (N'tb_Auth_SchemaVersion',N'tb_Auth_LoginIdentifier',N'tb_Auth_AuditEvent',N'tb_Auth_AuditOutbox')"));
        Assert.Equal(8, await db.CountAsync("SELECT COUNT(*) FROM dbo.tb_Auth_User WHERE IsAdmin=1 AND TenantId IS NULL"));
        var after = await runner.InspectAsync();
        Assert.Equal(before.Counts.OrderBy(x => x.Key), after.Counts.OrderBy(x => x.Key));
        db.Manifest.Roles[0] = originalRole;
        await runner.ApplyAsync(db.Manifest, "valid-after-rollback");
        await runner.VerifyAsync();
    }

    [SqlTheory]
    [InlineData("companies", 501)]
    [InlineData("projects", 101)]
    public async Task OwnershipTargetsCannotBypassCandidatesThroughDirectRequests(string resource, long id)
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync();
        await db.ExecuteAsync("INSERT dbo.tb_Unit_Department(TenantId,DeptName) VALUES(1,N'范围外部门')");
        var outsideDepartment = await db.CountAsync("SELECT MAX(Id) FROM dbo.tb_Unit_Department WHERE TenantId=1");
        await using var factory = new ApiFactory(db.Connection);
        using var manager = await Login(factory, 2); using var member = await Login(factory, 3);
        var route = "/api/v1/bzss/" + resource;
        async Task Grants(string scope) => await Data(await manager.PutAsJsonAsync("/api/v1/auth/crud-roles/1/permissions", new
        {
            grants = new[] { new { permission = "bzss." + resource + ".read", scopeType = "TenantAll", departmentIds = Array.Empty<long>() },
                new { permission = "bzss." + resource + ".create", scopeType = scope, departmentIds = Array.Empty<long>() },
                new { permission = "bzss." + resource + ".transfer", scopeType = scope, departmentIds = Array.Empty<long>() } }
        }));
        await Grants("Self");
        var row = await Data(await member.GetAsync(route + "/" + id));
        var version = row.GetProperty("rowVersion").GetString()!;
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsJsonAsync(route, new { ownerUserId = 3, ownerDepartmentId = outsideDepartment })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await PutVersion(member, route + "/" + id + "/ownership", new { ownerUserId = 3, ownerDepartmentId = outsideDepartment }, version)).StatusCode);
        await Grants("Department");
        // 用户7属于同租户，但没有确认的部门绑定，不能成为 Department 操作的目标负责人。
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsJsonAsync(route, new { ownerUserId = 7, ownerDepartmentId = 10 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await PutVersion(member, route + "/" + id + "/ownership", new { ownerUserId = 7, ownerDepartmentId = 10 }, version)).StatusCode);
        await Data(await PutVersion(member, route + "/" + id + "/ownership", new { ownerUserId = 2, ownerDepartmentId = 10 }, version));
    }
    [SqlFact]
    public async Task ReadAllDoesNotPermitUpdatingOthersOrCrossTenantRows()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection); using var member = await Login(factory, 3);
        var rows = await Data(await member.GetAsync("/api/v1/bzss/projects")); Assert.Equal(2, rows.GetProperty("total").GetInt64());
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync("/api/v1/bzss/projects/201")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync("/api/v1/bzss/projects/999")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/v1/auth/users")).StatusCode);
        var other = await Data(await member.GetAsync("/api/v1/bzss/projects/102"));
        Assert.Equal(HttpStatusCode.NotFound, (await PutVersion(member, "/api/v1/bzss/projects/102", new { projName = "越权" }, other.GetProperty("rowVersion").GetString()!)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/v1/auth/candidates?purpose=auth.users.create&kind=user")).StatusCode);
    }
    [SqlFact]
    public async Task StaleOwnershipWritesFailAndAuthorizedBusinessWriteRollsBackWithOutbox()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection); using var member = await Login(factory, 3);
        var row = await Data(await member.GetAsync("/api/v1/bzss/projects/101")); var version = row.GetProperty("rowVersion").GetString()!;
        await Data(await PutVersion(member, "/api/v1/bzss/projects/101", new { projName = "第一次" }, version));
        Assert.Equal(HttpStatusCode.Conflict, (await PutVersion(member, "/api/v1/bzss/projects/101", new { projName = "旧版本" }, version)).StatusCode);
        row = await Data(await member.GetAsync("/api/v1/bzss/projects/101")); version = row.GetProperty("rowVersion").GetString()!;
        Assert.Equal(HttpStatusCode.Forbidden, (await PutVersion(member, "/api/v1/bzss/projects/101/ownership", new { ownerUserId = 2, ownerDepartmentId = 10 }, version)).StatusCode);
        await db.ExecuteAsync("CREATE TRIGGER dbo.TestRejectOutbox ON dbo.tb_Auth_AuditOutbox INSTEAD OF INSERT AS BEGIN THROW 51001,N'测试回滚',1; END");
        Assert.Equal(HttpStatusCode.InternalServerError, (await PutVersion(member, "/api/v1/bzss/projects/101", new { projName = "必须回滚" }, version)).StatusCode);
        Assert.Equal(0, await db.CountAsync("SELECT COUNT(*) FROM dbo.tb_Bzss_Project WHERE Id=101 AND ProjName=N'必须回滚'"));
    }
    [SqlFact]
    public async Task PermissionRevocationAndPasswordResetInvalidateNextRequest()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection); using var manager = await Login(factory, 2); using var member = await Login(factory, 3);
        await Data(await member.GetAsync("/api/v1/bzss/projects")); await Data(await manager.PutAsJsonAsync("/api/v1/auth/crud-roles/1/permissions", new { grants = Array.Empty<object>() }));
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/v1/bzss/projects")).StatusCode);
        await Data(await manager.PostAsJsonAsync("/api/v1/auth/users/3/reset-password", new { password = "Reset-pass123!" }));
        Assert.Equal(HttpStatusCode.Unauthorized, (await member.GetAsync("/api/v1/auth/me")).StatusCode);
        using var next = factory.CreateClient(); var data = await Data(await next.PostAsJsonAsync("/api/v1/auth/login", new { userName = "user3", password = "Reset-pass123!" }));
        next.DefaultRequestHeaders.Authorization = new("Bearer", data.GetProperty("token").GetString());
        Assert.True((await Data(await next.GetAsync("/api/v1/auth/me"))).GetProperty("mustChangePassword").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await next.GetAsync("/api/v1/auth/access")).StatusCode);
    }
    [SqlFact]
    public async Task AdministratorTargetsAndConcurrentLastAdministratorAreProtected()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection); using var manager = await Login(factory, 2); using var platform = await Login(factory, 1);
        Assert.Equal(HttpStatusCode.NotFound, (await manager.PutAsJsonAsync("/api/v1/auth/users/7/status", new { isActived = false })).StatusCode);
        var attempts = await Task.WhenAll(platform.PutAsJsonAsync("/api/v1/auth/administrators/1/status", new { isActived = false }), platform.PutAsJsonAsync("/api/v1/auth/administrators/6/status", new { isActived = false }));
        Assert.Contains(attempts, x => x.IsSuccessStatusCode); Assert.True(await db.CountAsync("SELECT COUNT(*) FROM dbo.tb_Auth_User WHERE IsAdmin=1 AND SecurityReady=1 AND IsActived=1 AND IsDeleted=0") >= 1);
    }
    [SqlFact]
    public async Task ContextsAreBoundToSessionsAndParallelTabsStayInTheirTenants()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection); using var platform = await Login(factory, 1); using var otherSession = await Login(factory, 1);
        var a = await Data(await platform.PostAsJsonAsync("/api/v1/auth/tenant-contexts", new { tenantId = 1 })); var b = await Data(await platform.PostAsJsonAsync("/api/v1/auth/tenant-contexts", new { tenantId = 2 }));
        async Task<HttpResponseMessage> Get(HttpClient client, JsonElement context) { using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/bzss/projects"); request.Headers.Add(ResourceSecurityCatalog.ContextHeader, context.GetProperty("id").GetString()); return await client.SendAsync(request); }
        var pages = await Task.WhenAll(Get(platform, a), Get(platform, b));
        foreach (var row in (await Data(pages[0])).GetProperty("items").EnumerateArray()) Assert.Equal(1, row.GetProperty("tenantId").GetInt64());
        foreach (var row in (await Data(pages[1])).GetProperty("items").EnumerateArray()) Assert.Equal(2, row.GetProperty("tenantId").GetInt64());
        Assert.Equal(HttpStatusCode.Forbidden, (await Get(otherSession, a)).StatusCode);
    }
    [SqlFact]
    public async Task TenantAdministratorRevocationSerializesAndCrossTenantRelationsAreRejected()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection);
        using var platform = await Login(factory, 1); using var manager = await Login(factory, 2);
        Assert.Equal(HttpStatusCode.NotFound, (await manager.PostAsJsonAsync("/api/v1/unit/employees", new { userId = 5, departmentId = 10, tenantId = 2 })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await manager.PostAsJsonAsync("/api/v1/auth/crud-role-users", new { roleId = 1, userId = 5 })).StatusCode);
        var context = await Data(await platform.PostAsJsonAsync("/api/v1/auth/tenant-contexts", new { tenantId = 1 }));
        platform.DefaultRequestHeaders.Add(ResourceSecurityCatalog.ContextHeader, context.GetProperty("id").GetString());
        var attempts = await Task.WhenAll(platform.PutAsJsonAsync("/api/v1/auth/users/2/tenant-administrator", new { isAdministrator = false }),
            platform.PutAsJsonAsync("/api/v1/auth/users/7/tenant-administrator", new { isAdministrator = false }));
        Assert.Single(attempts, x => x.IsSuccessStatusCode); Assert.Single(attempts, x => x.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(1, await db.CountAsync("SELECT COUNT(*) FROM dbo.tb_Auth_CrudRoleUser ru JOIN dbo.tb_Auth_CrudRole r ON ru.RoleId=r.Id WHERE ru.IsDeleted=0 AND ru.TenantId=1 AND r.RoleKind=N'TenantAdministrator'"));
    }

    [SqlFact]
    public async Task DisabledOwnersRemainEditableAndDisabledAdministratorCanBeRevoked()
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection);
        using var manager = await Login(factory, 2); using var platform = await Login(factory, 1);
        await Data(await manager.PutAsJsonAsync("/api/v1/auth/users/3/status", new { isActived = false }));
        var row = await Data(await manager.GetAsync("/api/v1/bzss/projects/101"));
        await Data(await PutVersion(manager, "/api/v1/bzss/projects/101", new { projName = "保留原归属并修改内容" }, row.GetProperty("rowVersion").GetString()!));
        row = await Data(await manager.GetAsync("/api/v1/bzss/projects/101"));
        Assert.Equal(3, row.GetProperty("ownerUserId").GetInt64());
        Assert.Equal(HttpStatusCode.NotFound, (await PutVersion(manager, "/api/v1/bzss/projects/101/ownership",
            new { ownerUserId = 3, ownerDepartmentId = 10 }, row.GetProperty("rowVersion").GetString()!)).StatusCode);
        var context = await Data(await platform.PostAsJsonAsync("/api/v1/auth/tenant-contexts", new { tenantId = 1 }));
        platform.DefaultRequestHeaders.Add(ResourceSecurityCatalog.ContextHeader, context.GetProperty("id").GetString());
        await Data(await platform.PutAsJsonAsync("/api/v1/auth/administrators/7/status", new { isActived = false }));
        await Data(await platform.PutAsJsonAsync("/api/v1/auth/users/7/tenant-administrator", new { isAdministrator = false }));
        Assert.Equal(0, await db.CountAsync("SELECT COUNT(*) FROM dbo.tb_Auth_CrudRoleUser ru JOIN dbo.tb_Auth_CrudRole r ON ru.RoleId=r.Id WHERE ru.IsDeleted=0 AND ru.UserId=7 AND r.RoleKind=N'TenantAdministrator'"));
    }

    public static IEnumerable<object[]> Resources() => ResourceSecurityCatalog.Resources.Select(x => new object[] { x.Key });
    [SqlTheory, MemberData(nameof(Resources))]
    public async Task AllSixteenResourceEndpointsRejectAUsersUnassignedOperations(string key)
    {
        await using var db = new SqlDatabase(); await db.InitializeAsync(); await using var factory = new ApiFactory(db.Connection); using var member = await Login(factory, 3);
        var route = "/api/v1/" + key.Replace('.', '/');
        if (key == "bzss.projects") Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync(route + "/201")).StatusCode);
        else
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync(route + "?all=true")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync(route + "/1")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsJsonAsync(route, new { tenantId = 2 })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await member.PutAsJsonAsync(route + "/1", new { tenantId = 2 })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await member.DeleteAsync(route + "/1")).StatusCode);
        }
    }
}
