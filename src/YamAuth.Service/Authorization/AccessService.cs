using Microsoft.Extensions.Caching.Memory;
using YamAuth.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Entity.YamBase.Unit;
using YamAuth.Repository.Authorization;

namespace YamAuth.Service.Authorization;

public sealed class AccessService(SecurityStore store, AccessContext access, IMemoryCache cache)
{
    public async Task<AccessSnapshot> LoadAsync(long userId, Guid sessionId, long securityVersion, Guid? contextId, bool writing = false)
    {
        for (var attempt = 0; attempt < 3; attempt++)
        {
            var now = DateTime.UtcNow;
            var session = await store.Select<LoginSession>().Where(x => x.Id == sessionId && x.UserId == userId
                && x.SecurityVersion == securityVersion && x.RevokedAt == null && x.ExpiresAt > now).FirstAsync();
            var user = await store.Select<User>().Where(x => x.Id == userId && !x.IsDeleted && x.IsActived
                && x.SecurityReady && x.SecurityVersion == securityVersion).FirstAsync();
            if (session == null || user == null || !user.IsAdmin && user.TenantId is not > 0 || user.IsAdmin && user.TenantId != null)
                throw new AccessException("会话已失效，请重新登录", 401, "SessionInvalidated");
            var backend = await store.Select<AppsInfo>().Where(x => !x.IsDeleted && x.AppKind == ResourceSecurityCatalog.BackendKind
                && x.AppsCode == ResourceSecurityCatalog.BackendCode).FirstAsync()
                ?? throw new AccessException("后台权限目录尚未完成初始化", 503);
            long? tenantId = user.IsAdmin ? null : user.TenantId;
            if (contextId is Guid context)
            {
                if (!user.IsAdmin) throw new AccessException("该账号不能使用平台管理上下文", 403, "ContextInvalidated");
                var entered = await store.Select<TenantContext>().Where(x => x.Id == context && x.UserId == userId
                    && x.SessionId == sessionId && x.RevokedAt == null && x.ExpiresAt > now).FirstAsync()
                    ?? throw new AccessException("租户管理上下文已失效", 403, "ContextInvalidated");
                tenantId = entered.TenantId;
            }
            Tenant? tenant = null;
            if (tenantId is long id)
            {
                var query = store.Select<Tenant>().Where(x => x.Id == id && !x.IsDeleted && x.IsActived);
                if (writing) query = query.ForUpdate();
                tenant = await query.FirstAsync();
                if (tenant == null) throw new AccessException("租户已停用或不存在", user.IsAdmin ? 403 : 401,
                    user.IsAdmin ? "ContextInvalidated" : "SessionInvalidated");
            }
            else if (writing)
            {
                // 平台身份维护共用固定记录的更新锁，防止并发移除最后一位平台管理员。
                await store.Select<AppsInfo>().Where(x => x.Id == backend.Id).ForUpdate().FirstAsync();
            }
            var key = $"access:{userId}:{sessionId}:{securityVersion}:{tenantId}:{backend.Id}:{tenant?.AuthorizationVersion}:{backend.CatalogVersion}:{contextId}";
            if (!writing && cache.TryGetValue<AccessSnapshot>(key, out var cached) && cached != null)
                return cached with { NickName = user.NickName, UserName = user.UserName, MustChangePassword = user.MustChangePassword, IsPlatformAdmin = user.IsAdmin };

            var employee = tenantId == null ? new List<Employee>() : await store.Select<Employee>()
                .Where(x => !x.IsDeleted && x.OwnershipConfirmed && x.TenantId == tenantId && x.UserId == userId).Limit(2).ToListAsync();
            if (employee.Count > 1) throw new AccessException("账号存在重复员工绑定，请联系管理员", 403, "InvalidAuthorization");
            var departmentId = employee.SingleOrDefault()?.DepartmentId;
            if (departmentId != null && !await store.Select<Department>().Where(x => x.Id == departmentId && x.TenantId == tenantId && !x.IsDeleted).AnyAsync())
                departmentId = null;
            var links = await store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.UserId == userId
                && x.TenantId == tenantId && x.AppsId == backend.Id).ToListAsync(x => x.RoleId);
            var roles = links.Count == 0 ? new List<CrudRole>() : await store.Select<CrudRole>()
                .Where(x => !x.IsDeleted && x.TenantId == tenantId && x.AppsId == backend.Id && links.Contains(x.Id)).ToListAsync();
            var isTenantAdmin = roles.Any(x => x.RoleKind == ResourceSecurityCatalog.TenantAdministrator);
            var roleIds = roles.Where(x => x.RoleKind == ResourceSecurityCatalog.BusinessRole).Select(x => x.Id).ToArray();
            var grants = new List<OperationGrant>();
            if (roleIds.Length > 0)
            {
                var assigned = await store.Select<CrudRoleCrud>().Where(x => !x.IsDeleted && x.TenantId == tenantId
                    && x.AppsId == backend.Id && roleIds.Contains(x.CrudRoleId)).ToListAsync();
                var infoIds = assigned.Select(x => x.CrudInfoId).ToArray();
                var infos = await store.Select<CrudInfo>().Where(x => !x.IsDeleted && x.AppsId == backend.Id
                    && x.NodeType == "Operation" && infoIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id);
                var grantIds = assigned.Select(x => x.Id).ToArray();
                var configuredDepartments = await store.Select<GrantDepartment>().Where(x => x.TenantId == tenantId && grantIds.Contains(x.GrantId)).ToListAsync();
                var validDepartments = await store.Select<Department>().Where(x => !x.IsDeleted && x.TenantId == tenantId).ToListAsync(x => x.Id);
                foreach (var grant in assigned)
                {
                    if (!infos.TryGetValue(grant.CrudInfoId, out var info))
                        throw new AccessException("角色引用了无效权限，请联系管理员", 403, "InvalidAuthorization");
                    var departments = configuredDepartments.Where(x => x.GrantId == grant.Id).Select(x => x.DepartmentId).ToArray();
                    if (!Enum.TryParse<DataScopeType>(grant.ScopeType, out var scope) || !Enum.IsDefined(scope)
                        || departments.Any(x => !validDepartments.Contains(x)))
                        throw new AccessException("角色数据范围配置无效，请联系管理员", 403, "InvalidAuthorization");
                    try { ResourceSecurityCatalog.ValidateGrant(info.CrudCode, scope, departments); }
                    catch (AccessException) { throw new AccessException("角色包含不能授予的操作或范围", 403, "InvalidAuthorization"); }
                    grants.Add(new(info.CrudCode, scope, departments));
                }
            }
            var afterVersion = tenantId == null ? 0 : await store.Select<Tenant>().Where(x => x.Id == tenantId).FirstAsync(x => x.AuthorizationVersion);
            var afterCatalog = await store.Select<AppsInfo>().Where(x => x.Id == backend.Id).FirstAsync(x => x.CatalogVersion);
            if (afterVersion != (tenant?.AuthorizationVersion ?? 0) || afterCatalog != backend.CatalogVersion) continue;
            var result = new AccessSnapshot(user.Id, user.UserName, user.NickName, sessionId, securityVersion,
                user.IsAdmin, isTenantAdmin, user.MustChangePassword, user.TenantId, tenantId, tenant?.TenantName,
                departmentId, backend.Id, afterVersion, afterCatalog, contextId, grants);
            if (!writing) cache.Set(key, result, TimeSpan.FromMinutes(5));
            return result;
        }
        throw new AccessException("授权正在变化，请重试", 409);
    }

    public async Task<MeDto> MeAsync()
    {
        var current = access.Require();
        var user = await store.Select<User>().Where(x => x.Id == current.UserId && !x.IsDeleted).FirstAsync()
            ?? throw new AccessException("账号不存在", 401);
        return new(user.Id, user.UserName, user.NickName, user.Avatar, user.Phone, user.Email,
            current.IsPlatformAdmin ? "PlatformAdministrator" : current.IsTenantAdmin ? "TenantAdministrator" : "Member",
            user.MustChangePassword, user.TenantId, current.TenantId, current.TenantName, current.ContextId);
    }

    public async Task<AccessDto> GetAccessAsync()
    {
        var current = access.Require();
        var permissions = ResourceSecurityCatalog.Permissions.Where(x => current.Can(x.Code)).Select(x =>
        {
            var scope = current.Scope(x.Code);
            return new EffectivePermissionDto(x.Code, scope.Self, scope.TenantAll, scope.DepartmentIds.Order().ToArray());
        }).ToArray();
        return new(await MeAsync(), current.BackendAppId, current.AuthorizationVersion, current.CatalogVersion,
            permissions, await MenusAsync());
    }

    public async Task<List<MenuTreeDto>> MenusAsync()
    {
        var current = access.Require();
        if (current.MustChangePassword) return new();
        var permissions = await store.Select<CrudInfo>().Where(x => !x.IsDeleted && x.AppsId == current.BackendAppId
            && x.NodeType == "Operation").ToDictionaryAsync(x => x.Id);
        var all = await store.Select<CrudMenu>().Where(x => !x.IsDeleted && !x.IsHided && x.AppsId == current.BackendAppId)
            .OrderBy(x => x.SortIndex).OrderBy(x => x.Id).ToListAsync();
        var byId = all.ToDictionary(x => x.Id);
        var visible = new HashSet<long>();
        foreach (var menu in all.Where(x => x.MenuType == "menu" && x.CrudId != null))
        {
            if (!permissions.TryGetValue(menu.CrudId!.Value, out var info) || !current.Can(info.CrudCode)) continue;
            // 内置数据角色和原始关联页由新的授权界面接管，旧菜单不重新开放。
            if (menu.RoutePath is "/auth/data-roles" or "/auth/data-role-users" or "/auth/crud-role-cruds" or "/auth/crud-role-users") continue;
            var chain = new HashSet<long> { menu.Id };
            var parentId = menu.ParentId;
            var valid = true;
            while (parentId > 0)
            {
                if (!chain.Add(parentId) || !byId.TryGetValue(parentId, out var parent) || parent.MenuType != "dir") { valid = false; break; }
                parentId = parent.ParentId;
            }
            if (valid) visible.UnionWith(chain);
        }
        var nodes = all.Where(x => visible.Contains(x.Id)).Select(x => new MenuTreeDto
        {
            Id = x.Id, ParentId = x.ParentId, MenuName = x.MenuName ?? "", MenuUrl = x.RoutePath ?? "", MenuIcon = x.IconName
        }).ToList();
        var children = nodes.ToLookup(x => x.ParentId);
        foreach (var node in nodes) node.Children = children[node.Id].ToList();
        return nodes.Where(x => x.ParentId == 0).ToList();
    }
}
