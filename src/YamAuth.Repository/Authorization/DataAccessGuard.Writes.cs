using YamAuth.Authorization;
using YamAuth.Entity.Abstractions;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Entity.YamBase.Unit;
using YamAuth.Entity.YamBzss.Bzss;

namespace YamAuth.Repository.Authorization;

public sealed partial class DataAccessGuard
{
    public async Task PrepareCreateAsync<T>(T entity) where T : class, IAuditEntity, new()
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        Access.Demand(rule.Key + ".create");
        var current = Access.Require();
        var tenantProperty = typeof(T).GetProperty("TenantId");
        if (tenantProperty != null) tenantProperty.SetValue(entity, current.TenantId);
        switch (entity)
        {
            case User user:
                user.IsAdmin = false; user.IsActived = true; user.SecurityReady = true;
                user.MustChangePassword = true; user.SecurityVersion = 1;
                user.UserName = user.UserName.Trim(); user.Email = user.Email.Trim().ToLowerInvariant();
                break;
            case AppsInfo app: app.AppKind = ResourceSecurityCatalog.TenantAppKind; break;
            case CrudRole role: role.RoleKind = ResourceSecurityCatalog.BusinessRole; role.IsSystem = false; break;
            case Employee employee: employee.OwnershipConfirmed = true; break;
            case Company company: company.OwnershipConfirmed = true; break;
            case Project project: project.OwnershipConfirmed = true; break;
        }
        await ValidateRelationsAsync(entity, null);
    }

    public async Task ValidateUpdateAsync<T>(T before, T after) where T : class, IAuditEntity, new()
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        Access.Demand(rule.Key + ".update");
        foreach (var name in new[] { "TenantId", "AppKind", "RoleKind", "SecurityVersion", "SecurityReady", "MustChangePassword", "OwnershipConfirmed" })
            RequireUnchanged(before, after, name);
        if (after is User)
            foreach (var name in new[] { "Password", "PwdSalt", "IsAdmin", "IsActived", "Email" }) RequireUnchanged(before, after, name);
        if (after is Employee)
            foreach (var name in new[] { "UserId", "DepartmentId" }) RequireUnchanged(before, after, name);
        if (after is Company or Project)
            foreach (var name in new[] { "OwnerUserId", "OwnerDepartmentId" }) RequireUnchanged(before, after, name);
        if (after is CrudRole { RoleKind: not ResourceSecurityCatalog.BusinessRole })
            throw new AccessException("内置管理员角色只能通过专用入口维护");
        if (before is CrudRoleCrud oldGrant) await RequireRoleAsync(oldGrant.CrudRoleId);
        if (before is CrudRoleUser oldLink)
        {
            await RequireRoleAsync(oldLink.RoleId);
            if (await IsTenantAdministratorAsync(oldLink.UserId)) throw new AccessException("普通入口不能修改管理员授权");
        }
        if (before is CrudRole oldRole && after is CrudRole newRole && oldRole.AppsId != newRole.AppsId
            && (await Store.Select<CrudRoleCrud>().Where(x => !x.IsDeleted && x.CrudRoleId == oldRole.Id).AnyAsync()
                || await Store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.RoleId == oldRole.Id).AnyAsync()))
            throw new AccessException("角色仍有关联授权，不能直接修改所属应用", 409);
        await ValidateRelationsAsync(after, before);
    }

    public async Task ValidateDeleteAsync<T>(T entity) where T : class, IAuditEntity, new()
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        Access.Demand(rule.Key + ".delete");
        if (entity is CrudRole { RoleKind: not ResourceSecurityCatalog.BusinessRole })
            throw new AccessException("不能删除内置管理员角色");
        if (entity is AppsInfo { AppKind: ResourceSecurityCatalog.BackendKind })
            throw new AccessException("不能删除内置后台应用");
        if (entity is CrudRoleCrud grant) await RequireRoleAsync(grant.CrudRoleId);
        if (entity is CrudRoleUser assignment)
        {
            await RequireRoleAsync(assignment.RoleId);
            if (await IsTenantAdministratorAsync(assignment.UserId)) throw new AccessException("普通入口不能删除管理员授权");
        }
        if (entity is Department department)
        {
            if (await Store.Select<Employee>().Where(x => !x.IsDeleted && x.DepartmentId == department.Id).AnyAsync()
                || await Store.Select<Company>().Where(x => !x.IsDeleted && x.OwnerDepartmentId == department.Id).AnyAsync()
                || await Store.Select<Project>().Where(x => !x.IsDeleted && x.OwnerDepartmentId == department.Id).AnyAsync()
                || await Store.Select<GrantDepartment>().Where(x => x.DepartmentId == department.Id).AnyAsync())
                throw new AccessException("部门仍被员工、业务归属或授权引用", 409);
        }
        if (entity is Tenant tenant && await Store.Select<User>().Where(x => !x.IsDeleted && x.TenantId == tenant.Id).AnyAsync())
            throw new AccessException("租户仍有成员，请先停用租户并完成归档", 409);
        await ValidateParentAsync(entity, deleting: true);
    }

    public async Task AfterWriteAsync<T>(T entity, string action) where T : class, IAuditEntity, new()
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        if (entity is User user)
        {
            if (action == "delete")
            {
                await Store.Update<LoginSession>().Where(x => x.UserId == user.Id && x.RevokedAt == null)
                    .Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
                await Store.Delete<LoginIdentifier>().Where(x => x.UserId == user.Id).ExecuteAffrowsAsync();
            }
            else await Store.SaveIdentifiersAsync(user);
        }
        if (entity is CrudRoleCrud changedGrant && action is "update" or "delete")
            await Store.Delete<GrantDepartment>().Where(x => x.GrantId == changedGrant.Id).ExecuteAffrowsAsync();
        if (entity is CrudRole deletedRole && action == "delete")
        {
            var grantIds = await Store.Select<CrudRoleCrud>().Where(x => x.CrudRoleId == deletedRole.Id).ToListAsync(x => x.Id);
            await Store.Delete<GrantDepartment>().Where(x => grantIds.Contains(x.GrantId)).ExecuteAffrowsAsync();
            await Store.Update<CrudRoleCrud>().Where(x => x.CrudRoleId == deletedRole.Id && !x.IsDeleted)
                .Set(x => x.IsDeleted, true).Set(x => x.DeleterId, Access.Require().UserId).Set(x => x.DeleteTime, DateTime.UtcNow).ExecuteAffrowsAsync();
            await Store.Update<CrudRoleUser>().Where(x => x.RoleId == deletedRole.Id && !x.IsDeleted)
                .Set(x => x.IsDeleted, true).Set(x => x.DeleterId, Access.Require().UserId).Set(x => x.DeleteTime, DateTime.UtcNow).ExecuteAffrowsAsync();
        }
        var current = Access.Require();
        if (current.TenantId is long tenant && entity is CrudRole or CrudRoleCrud or CrudRoleUser or Employee or Department or User)
            await Store.BumpTenantAsync(tenant);
        if (rule.Kind == ResourceKind.Definition && current.IsPlatformAdmin && current.TenantId == null)
            await Store.BumpCatalogAsync(current.BackendAppId);
        await Store.AuditAsync(rule.Key + "." + action, rule.Entity, entity.Id,
            summary: new { id = entity.Id });
    }

    /// <summary>分别检查负责人候选、部门候选和结果记录范围；负责人当前部门须由服务端员工关系取得。</summary>
    public void ValidateDestination(string permission, long? ownerUserId, long? departmentId, long? ownerCurrentDepartmentId = null)
    {
        if (ownerUserId is not > 0) throw new AccessException("请选择负责人", 400);
        var current = Access.Require();
        var scope = current.Scope(permission);
        // 归属字段分别授权，不能让一个合法字段替另一个越界字段放行。
        // 业务归属与员工当前部门独立，合法的两个目标无需属于同一个部门。
        if (!(scope.TenantAll || scope.Self && ownerUserId == current.UserId
            || ownerCurrentDepartmentId is long ownerDepartment && scope.DepartmentIds.Contains(ownerDepartment)))
            throw new AccessException("负责人不在该操作允许的范围内");
        if (departmentId is long targetDepartment && !(scope.TenantAll || scope.DepartmentIds.Contains(targetDepartment)
            || scope.Self && current.DepartmentId == targetDepartment))
            throw new AccessException("归属部门不在该操作允许的范围内");
        if (!(scope.TenantAll || scope.Self && ownerUserId == current.UserId
            || departmentId is long department && scope.DepartmentIds.Contains(department)))
            throw new AccessException("目标归属不在该操作允许的范围内");
    }

    public async Task ValidateOwnerAsync(string permission, long? ownerUserId, long? departmentId)
    {
        if (ownerUserId is not long userId) throw new AccessException("请选择负责人", 400);
        await RequireUserAsync(userId);
        if (departmentId is long id) await RequireDepartmentAsync(id);
        var current = Access.Require();
        var scope = current.Scope(permission);
        long? ownerDepartment = null;
        if (!scope.TenantAll && !(scope.Self && userId == current.UserId))
            ownerDepartment = await Store.Select<Employee>().Where(x => !x.IsDeleted && x.OwnershipConfirmed
                && x.TenantId == current.TenantId && x.UserId == userId).FirstAsync(x => x.DepartmentId);
        ValidateDestination(permission, ownerUserId, departmentId, ownerDepartment);
    }

    public async Task<User> RequireUserAsync(long id, bool requireActive = true)
    {
        var tenant = Access.Require().TenantId;
        return await Store.Select<User>().Where(x => x.Id == id && !x.IsDeleted && x.SecurityReady && (!requireActive || x.IsActived)
            && !x.IsAdmin && x.TenantId == tenant).FirstAsync()
            ?? throw new AccessException("关联用户不存在或不可选择", 404);
    }

    public async Task<Department> RequireDepartmentAsync(long id)
    {
        var tenant = Access.Require().TenantId;
        return await Store.Select<Department>().Where(x => x.Id == id && !x.IsDeleted && x.TenantId == tenant).FirstAsync()
            ?? throw new AccessException("关联部门不存在或不可选择", 404);
    }

    public async Task<CrudRole> RequireRoleAsync(long id, bool allowProtected = false)
    {
        var current = Access.Require();
        var role = await Store.Select<CrudRole>().Where(x => x.Id == id && !x.IsDeleted && x.TenantId == current.TenantId).FirstAsync()
            ?? throw new AccessException("角色不存在或不可选择", 404);
        await RequireAppAsync(role.AppsId, allowBackend: true);
        if (!allowProtected && role.RoleKind != ResourceSecurityCatalog.BusinessRole)
            throw new AccessException("内置管理员角色不能通过普通授权入口分配");
        return role;
    }

    public async Task<AppsInfo> RequireAppAsync(long? id, bool allowBackend = false)
    {
        var current = Access.Require();
        var app = await Store.Select<AppsInfo>().Where(x => x.Id == id && !x.IsDeleted).FirstAsync()
            ?? throw new AccessException("应用不存在或不可选择", 404);
        if (app.AppKind == ResourceSecurityCatalog.BackendKind && app.Id == current.BackendAppId
            && (allowBackend || current.IsPlatformAdmin && current.TenantId == null)) return app;
        if (app.AppKind != ResourceSecurityCatalog.TenantAppKind || current.TenantId == null || app.TenantId != current.TenantId)
            throw new AccessException("应用不属于当前租户", 404);
        return app;
    }

    public async Task<bool> IsTenantAdministratorAsync(long userId)
    {
        var current = Access.Require();
        var roles = await Store.Select<CrudRole>().Where(x => !x.IsDeleted && x.TenantId == current.TenantId
            && x.AppsId == current.BackendAppId && x.RoleKind == ResourceSecurityCatalog.TenantAdministrator).ToListAsync(x => x.Id);
        return await Store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.UserId == userId
            && x.TenantId == current.TenantId && x.AppsId == current.BackendAppId && roles.Contains(x.RoleId)).AnyAsync();
    }

    async Task ValidateRelationsAsync<T>(T entity, T? before) where T : class, IAuditEntity, new()
    {
        var current = Access.Require();
        switch (entity)
        {
            case AppsInfo app:
                if (before == null && current.TenantId == null)
                    throw new AccessException("新增租户应用前请进入目标租户");
                if (app.AppKind == ResourceSecurityCatalog.BackendKind && (!current.IsPlatformAdmin || app.AppsCode != ResourceSecurityCatalog.BackendCode))
                    throw new AccessException("不能修改内置应用身份");
                break;
            case AppsUser member:
                await RequireAppAsync(member.AppsId);
                await RequireUserAsync(member.UserId ?? 0);
                if (await Store.Select<AppsUser>().Where(x => !x.IsDeleted && x.Id != member.Id && x.AppsId == member.AppsId && x.UserId == member.UserId).AnyAsync())
                    throw new AccessException("应用成员已存在", 409);
                break;
            case CrudInfo info:
                var infoApp = await RequireAppAsync(info.AppsId);
                if (info.NodeType is not ("Directory" or "Operation")) throw new AccessException("请选择目录或操作节点", 400);
                if (infoApp.AppKind == ResourceSecurityCatalog.BackendKind && info.NodeType == "Operation")
                {
                    var definition = ResourceSecurityCatalog.Permission(info.CrudCode);
                    if (definition == null || info.ResourceKey != definition.Resource.Key || info.OperationCode != definition.Action)
                        throw new AccessException("内置权限必须对应代码声明的操作", 400);
                }
                if (await Store.Select<CrudInfo>().Where(x => !x.IsDeleted && x.Id != info.Id && x.AppsId == info.AppsId && x.CrudCode == info.CrudCode).AnyAsync())
                    throw new AccessException("应用内权限编码重复", 409);
                break;
            case CrudMenu menu:
                await RequireAppAsync(menu.AppsId);
                if (menu.CrudId is long menuCrud) await RequireInfoAsync(menuCrud, menu.AppsId);
                if (menu.AllowAny) throw new AccessException("后台菜单不能配置为匿名访问", 400);
                if (menu.MenuType == "menu" && menu.CrudId == null) throw new AccessException("菜单必须关联页面权限", 400);
                break;
            case CrudItem item:
                var itemInfo = await RequireInfoAsync(item.CrudId ?? 0);
                await RequireAppAsync(itemInfo.AppsId);
                // 内置接口路径仅用于核对展示，实际鉴权始终由端点元数据决定。
                break;
            case CrudRole role: await RequireAppAsync(role.AppsId, allowBackend: true); break;
            case DataRole role: await RequireAppAsync(role.AppsId); break;
            case CrudRoleCrud grant:
                var grantRole = await RequireRoleAsync(grant.CrudRoleId);
                var grantInfo = await RequireInfoAsync(grant.CrudInfoId, grantRole.AppsId, allowBackend: true);
                if (!Enum.TryParse<DataScopeType>(grant.ScopeType, out var scope) || !Enum.IsDefined(scope))
                    throw new AccessException("操作授权缺少有效数据范围", 400);
                if (scope == DataScopeType.CustomDepartments)
                    throw new AccessException("指定部门授权请使用角色权限配置入口", 400);
                if (grantRole.AppsId == current.BackendAppId) ResourceSecurityCatalog.ValidateGrant(grantInfo.CrudCode, scope, Array.Empty<long>());
                if (grantInfo.NodeType != "Operation") throw new AccessException("只能授予具体操作", 400);
                grant.TenantId = current.TenantId; grant.AppsId = grantRole.AppsId;
                if (await Store.Select<CrudRoleCrud>().Where(x => !x.IsDeleted && x.Id != grant.Id && x.TenantId == current.TenantId && x.AppsId == grant.AppsId && x.CrudRoleId == grant.CrudRoleId && x.CrudInfoId == grant.CrudInfoId).AnyAsync())
                    throw new AccessException("角色已包含该操作", 409);
                break;
            case CrudRoleUser assignment:
                var assignedRole = await RequireRoleAsync(assignment.RoleId);
                await RequireUserAsync(assignment.UserId);
                if (await IsTenantAdministratorAsync(assignment.UserId)) throw new AccessException("不能通过普通角色入口修改管理员授权");
                assignment.TenantId = current.TenantId; assignment.AppsId = assignedRole.AppsId;
                if (await Store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.Id != assignment.Id && x.TenantId == current.TenantId && x.AppsId == assignment.AppsId && x.RoleId == assignment.RoleId && x.UserId == assignment.UserId).AnyAsync())
                    throw new AccessException("成员已拥有该角色", 409);
                break;
            case DataRoleUser legacy:
                var dataRole = await Store.Select<DataRole>().Where(x => x.Id == legacy.RoleId && !x.IsDeleted && x.TenantId == current.TenantId).FirstAsync()
                    ?? throw new AccessException("数据角色不存在", 404);
                await RequireAppAsync(dataRole.AppsId); await RequireUserAsync(legacy.UserId); break;
            case Department department:
                if (department.DirectorId is long director)
                {
                    if (!await Store.Select<Employee>().Where(x => x.Id == director && !x.IsDeleted && x.OwnershipConfirmed && x.TenantId == current.TenantId).AnyAsync())
                        throw new AccessException("部门负责人必须是本租户有效员工", 400);
                }
                break;
            case Employee employee:
                if (before != null) break; // 普通编辑不改变组织关系，原关联可能已停用。
                if (employee.UserId is long employeeUser)
                {
                    await RequireUserAsync(employeeUser);
                    if (!current.IsPlatformAdmin && employeeUser != current.UserId && await IsTenantAdministratorAsync(employeeUser))
                        throw new AccessException("其他管理员的组织关系须由平台维护");
                    if (await Store.Select<Employee>().Where(x => !x.IsDeleted && x.OwnershipConfirmed && x.Id != employee.Id && x.UserId == employeeUser).AnyAsync())
                        throw new AccessException("账号已绑定有效员工记录", 409);
                }
                if (employee.DepartmentId is long employeeDepartment) await RequireDepartmentAsync(employeeDepartment);
                break;
            // 普通编辑已保证归属不变；原负责人停用后仍可维护内容，新归属只在创建和转移时校验。
            case Company company when before == null: await ValidateOwnerAsync("bzss.companies.create", company.OwnerUserId, company.OwnerDepartmentId); break;
            case Project project when before == null: await ValidateOwnerAsync("bzss.projects.create", project.OwnerUserId, project.OwnerDepartmentId); break;
        }
        await ValidateParentAsync(entity);
    }

    async Task<CrudInfo> RequireInfoAsync(long id, long? appId = null, bool allowBackend = false)
    {
        var info = await Store.Select<CrudInfo>().Where(x => x.Id == id && !x.IsDeleted).FirstAsync()
            ?? throw new AccessException("功能不存在或不可选择", 404);
        await RequireAppAsync(info.AppsId, allowBackend);
        if (appId.HasValue && info.AppsId != appId) throw new AccessException("功能与目标所属应用不一致", 400);
        return info;
    }

    async Task ValidateParentAsync<T>(T entity, bool deleting = false) where T : class, IAuditEntity, new()
    {
        var type = typeof(T);
        var property = type.GetProperty("ParentId");
        if (property == null) return;
        var rule = ResourceSecurityCatalog.Entity(type.Name);
        var all = await Store.Db.Select<T>().WithTransaction(Store.Transaction).Where(Predicate(rule, rule.Key + ".read")).ToListAsync();
        ValidateHierarchy(entity, all, deleting);
    }

    /// <summary>在已限定租户和应用的快照内检查层级；菜单关联的页面权限不属于父子继承字段。</summary>
    public static void ValidateHierarchy<T>(T entity, IReadOnlyList<T> all, bool deleting = false) where T : class, IAuditEntity, new()
    {
        var type = typeof(T);
        var property = type.GetProperty("ParentId");
        if (property == null) return;
        var scopeFields = entity is CrudItem ? new[] { "CrudId" } : new[] { "AppsId" };
        long Parent(T item) => Convert.ToInt64(property.GetValue(item) ?? 0);
        if (deleting)
        {
            if (all.Any(x => Parent(x) == entity.Id)) throw new AccessException("请先处理子节点", 409);
            return;
        }
        var parentId = Parent(entity);
        var visited = new HashSet<long> { entity.Id };
        while (parentId != 0)
        {
            if (parentId < 0) throw new AccessException("父节点编号不能为负数", 400);
            if (!visited.Add(parentId)) throw new AccessException("父节点不能形成循环", 400);
            var parent = all.SingleOrDefault(x => x.Id == parentId) ?? throw new AccessException("父节点不属于当前管理范围", 404);
            if (parent is CrudMenu { MenuType: not "dir" }) throw new AccessException("菜单的上级必须是目录", 400);
            foreach (var field in scopeFields)
            {
                var scope = type.GetProperty(field);
                if (scope != null && !Equals(scope.GetValue(parent), scope.GetValue(entity)))
                    throw new AccessException("父子节点必须属于同一应用或功能", 400);
            }
            parentId = Parent(parent);
        }
        var existing = all.SingleOrDefault(x => x.Id == entity.Id);
        if (existing != null && all.Any(x => Parent(x) == entity.Id))
        {
            if (entity is CrudMenu { MenuType: not "dir" }) throw new AccessException("存在子菜单时不能改为菜单节点", 400);
            foreach (var field in scopeFields) RequireUnchanged(existing, entity, field);
        }
    }

    static void RequireUnchanged<T>(T before, T after, string name)
    {
        var property = typeof(T).GetProperty(name);
        if (property != null && !Equals(property.GetValue(before), property.GetValue(after)))
            throw new AccessException($"字段 {name} 只能通过专用操作维护", 400);
    }
}
