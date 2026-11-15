using FreeSql;
using YamAuth.Authorization;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.Abstractions;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Entity.YamBase.Unit;
using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.Authorization;

namespace YamAuth.Service.Authorization;

/// <summary>候选接口按发起操作授权，只返回编号和显示名，不复用用户管理等完整 DTO。</summary>
public sealed class CandidateService(SecurityStore store, AccessContext access, DataAccessGuard guard)
{
    public async Task<PagedResult<CandidateDto>> QueryAsync(CandidateQueryDto query)
    {
        var current = access.Require();
        if (query.Purpose == "platform.contexts")
        {
            if (!current.IsPlatformAdmin || current.MustChangePassword || query.Kind != "tenant") throw new AccessException("没有查询租户候选的权限");
            var tenants = store.Select<Tenant>().Where(x => !x.IsDeleted && x.IsActived);
            return await PageAsync(tenants, query, x => x.TenantName ?? "", x => x.TenantName != null && x.TenantName.Contains(query.Keyword!));
        }
        var management = query.Purpose is "roles.configure" or "users.roles" or "administrators.appoint";
        if (management)
        {
            if (!current.IsTenantManager || current.MustChangePassword) throw new AccessException("没有维护授权的权限");
            if (query.Purpose == "administrators.appoint" && !current.IsPlatformAdmin) throw new AccessException("仅平台管理员可以任命管理员");
        }
        else
        {
            access.Demand(query.Purpose);
            var permission = ResourceSecurityCatalog.Permission(query.Purpose)!;
            if (permission.Action is not ("create" or "update" or "assignment" or "transfer"))
                throw new AccessException("该操作不提供关联候选", 400);
            if (permission.Resource.Kind == ResourceKind.User || permission.Resource.Kind == ResourceKind.Employee && permission.Action == "update")
                throw new AccessException("该操作不允许修改关联字段", 400);
            if (query.TargetId is long target) await AssertTargetAsync(permission.Resource.Entity, target, query.Purpose);
            else if (permission.Action != "create") throw new AccessException("关联查询缺少目标记录", 400);
        }

        var scope = management ? EffectiveScope.All : current.Scope(query.Purpose);
        var owned = query.Purpose.StartsWith("bzss.", StringComparison.Ordinal);
        var tenant = current.TenantId;
        switch (query.Kind)
        {
            case "user":
                if (!owned && !current.IsTenantManager) throw new AccessException("没有查询用户候选的权限");
                var users = store.Select<User>().Where(x => !x.IsDeleted && x.SecurityReady && x.IsActived && !x.IsAdmin && x.TenantId == tenant);
                if (!scope.TenantAll)
                {
                    var departments = scope.DepartmentIds.ToArray();
                    var departmentUsers = departments.Length == 0 ? new List<long?>() : await store.Select<Employee>()
                        .Where(x => !x.IsDeleted && x.OwnershipConfirmed && x.TenantId == tenant && departments.Contains(x.DepartmentId!.Value)).ToListAsync(x => x.UserId);
                    users = users.Where(x => scope.Self && x.Id == current.UserId || departmentUsers.Contains(x.Id));
                }
                return await PageAsync(users, query, x => x.NickName + " / " + x.UserName,
                    x => x.UserName.Contains(query.Keyword!) || x.NickName.Contains(query.Keyword!) || Convert.ToString(x.Id).Contains(query.Keyword!));
            case "department":
                if (!owned && !current.IsTenantManager) throw new AccessException("没有查询部门候选的权限");
                var departmentsQuery = store.Select<Department>().Where(x => !x.IsDeleted && x.TenantId == tenant);
                if (!scope.TenantAll)
                {
                    var ids = scope.DepartmentIds.ToHashSet();
                    if (scope.Self && current.DepartmentId is long department) ids.Add(department);
                    departmentsQuery = departmentsQuery.Where(x => ids.Contains(x.Id));
                }
                return await PageAsync(departmentsQuery, query, x => x.DeptName ?? "", x => x.DeptName != null && x.DeptName.Contains(query.Keyword!));
            case "app":
                if (!current.IsTenantManager && !(current.IsPlatformAdmin && tenant == null)) throw new AccessException("没有查询应用候选的权限");
                var canBackend = management || query.Purpose.StartsWith("auth.crud-roles.", StringComparison.Ordinal) || current.IsPlatformAdmin && tenant == null;
                var apps = store.Select<AppsInfo>().Where(x => !x.IsDeleted && (x.AppKind == ResourceSecurityCatalog.TenantAppKind && x.TenantId == tenant && tenant != null
                    || canBackend && x.Id == current.BackendAppId && x.AppKind == ResourceSecurityCatalog.BackendKind));
                return await PageAsync(apps, query, x => x.AppsName ?? "", x => x.AppsName != null && x.AppsName.Contains(query.Keyword!));
            case "crudRole":
                if (!current.IsTenantManager) throw new AccessException("没有查询角色候选的权限");
                query.AppsId ??= current.BackendAppId;
                await guard.RequireAppAsync(query.AppsId, allowBackend: true);
                var roles = store.Select<CrudRole>().Where(x => !x.IsDeleted && x.TenantId == tenant && x.AppsId == query.AppsId && x.RoleKind == ResourceSecurityCatalog.BusinessRole);
                return await PageAsync(roles, query, x => x.RoleName, x => x.RoleName.Contains(query.Keyword!));
            case "dataRole":
                if (!current.IsTenantManager) throw new AccessException("没有查询历史数据角色候选的权限");
                await guard.RequireAppAsync(query.AppsId);
                var legacy = store.Select<DataRole>().Where(x => !x.IsDeleted && x.TenantId == tenant && x.AppsId == query.AppsId);
                return await PageAsync(legacy, query, x => x.RoleName, x => x.RoleName.Contains(query.Keyword!));
            case "crudInfo":
                if (!current.IsTenantManager && !current.IsPlatformAdmin) throw new AccessException("没有查询功能候选的权限");
                if (query.AppsId != null) await guard.RequireAppAsync(query.AppsId, allowBackend: management);
                var allowedApps = await store.Select<AppsInfo>().Where(x => !x.IsDeleted && (tenant != null && x.TenantId == tenant && x.AppKind == ResourceSecurityCatalog.TenantAppKind
                    || (management || current.IsPlatformAdmin && tenant == null) && x.Id == current.BackendAppId))
                    .ToListAsync(x => x.Id);
                var infos = store.Select<CrudInfo>().Where(x => !x.IsDeleted && allowedApps.Contains(x.AppsId!.Value)
                    && (query.AppsId == null || x.AppsId == query.AppsId) && x.NodeType == "Operation");
                return await PageAsync(infos, query, x => x.CrudName ?? x.CrudCode,
                    x => x.CrudCode.Contains(query.Keyword!) || x.CrudName != null && x.CrudName.Contains(query.Keyword!));
            case "employee":
                if (!current.IsTenantManager) throw new AccessException("没有查询员工候选的权限");
                var employees = store.Select<Employee>().Where(x => !x.IsDeleted && x.OwnershipConfirmed && x.TenantId == tenant);
                return await PageAsync(employees, query, x => "员工 #" + x.Id, x => Convert.ToString(x.Id).Contains(query.Keyword!));
            default: throw new AccessException("不支持的关联类型", 400);
        }
    }

    static async Task<PagedResult<CandidateDto>> PageAsync<T>(ISelect<T> select, CandidateQueryDto query,
        System.Linq.Expressions.Expression<Func<T, string>> label,
        System.Linq.Expressions.Expression<Func<T, bool>> keyword) where T : class, IAuditEntity, new()
    {
        if (query.Ids.Length > 0) select = select.Where(x => query.Ids.Contains(x.Id));
        if (!string.IsNullOrWhiteSpace(query.Keyword)) select = select.Where(keyword);
        var total = await select.CountAsync();
        var values = await select.OrderBy(x => x.Id).Page(query.Page, query.Size).ToListAsync();
        var readLabel = label.Compile();
        return new() { Total = total, Items = values.Select(x => new CandidateDto(x.Id, readLabel(x))).ToList() };
    }

    Task AssertTargetAsync(string entity, long id, string permission) => entity switch
    {
        "Company" => AssertAsync<Company>(id, permission), "Project" => AssertAsync<Project>(id, permission),
        "Employee" => AssertAsync<Employee>(id, permission), "Department" => AssertAsync<Department>(id, permission),
        "AppsInfo" => AssertAsync<AppsInfo>(id, permission), "AppsUser" => AssertAsync<AppsUser>(id, permission),
        "CrudInfo" => AssertAsync<CrudInfo>(id, permission), "CrudItem" => AssertAsync<CrudItem>(id, permission),
        "CrudMenu" => AssertAsync<CrudMenu>(id, permission), "CrudRole" => AssertAsync<CrudRole>(id, permission),
        "CrudRoleUser" => AssertAsync<CrudRoleUser>(id, permission), "CrudRoleCrud" => AssertAsync<CrudRoleCrud>(id, permission),
        "DataRole" => AssertAsync<DataRole>(id, permission), "DataRoleUser" => AssertAsync<DataRoleUser>(id, permission),
        _ => throw new AccessException("该资源不提供关联候选", 400)
    };

    async Task AssertAsync<T>(long id, string permission) where T : class, IAuditEntity, new()
    {
        if (!await guard.Select<T>(store.Db, permission).Where(x => x.Id == id).AnyAsync()) throw new AccessException("目标记录不存在或不可操作", 404);
    }
}
