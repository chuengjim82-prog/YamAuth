using YamAuth.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Authorization;

namespace YamAuth.Service.Authorization;

public sealed class PermissionManagementService(SecurityStore store, AccessContext access, DataAccessGuard guard)
{
    public async Task<IReadOnlyList<PermissionOptionDto>> CatalogAsync(long appsId)
    {
        var current = RequireManager();
        await guard.RequireAppAsync(appsId, allowBackend: true);
        if (appsId == current.BackendAppId)
            return ResourceSecurityCatalog.Permissions.Where(x => x.Assignable)
                .Select(x => new PermissionOptionDto(x.Code, x.Name, x.Resource.Key, x.SupportedScopes)).ToArray();
        var infos = await store.Select<CrudInfo>().Where(x => !x.IsDeleted && x.AppsId == appsId && x.NodeType == "Operation").ToListAsync();
        return infos.Select(x => new PermissionOptionDto(x.CrudCode, x.CrudName ?? x.CrudCode, x.ResourceKey ?? "", Enum.GetValues<DataScopeType>())).ToArray();
    }

    public async Task<IReadOnlyList<RoleGrantDto>> GetGrantsAsync(long id)
    {
        RequireManager();
        var role = await guard.RequireRoleAsync(id);
        var grants = await store.Select<CrudRoleCrud>().Where(x => !x.IsDeleted && x.CrudRoleId == id && x.TenantId == role.TenantId && x.AppsId == role.AppsId).ToListAsync();
        var ids = grants.Select(x => x.Id).ToArray();
        var departments = await store.Select<GrantDepartment>().Where(x => ids.Contains(x.GrantId) && x.TenantId == role.TenantId).ToListAsync();
        var infoIds = grants.Select(x => x.CrudInfoId).ToArray();
        var infos = await store.Select<CrudInfo>().Where(x => infoIds.Contains(x.Id) && !x.IsDeleted && x.AppsId == role.AppsId).ToDictionaryAsync(x => x.Id);
        return grants.Select(grant =>
        {
            if (!infos.TryGetValue(grant.CrudInfoId, out var info) || !Enum.TryParse<DataScopeType>(grant.ScopeType, out var scope) || !Enum.IsDefined(scope))
                throw new AccessException("角色存在无效历史授权，请先完成迁移核对", 409);
            return new RoleGrantDto(info.CrudCode, scope, departments.Where(x => x.GrantId == grant.Id).Select(x => x.DepartmentId).ToArray());
        }).ToArray();
    }

    public Task SaveGrantsAsync(long id, SaveRoleGrantsDto dto) => store.WriteAsync(async () =>
    {
        var current = RequireManager();
        var role = await guard.RequireRoleAsync(id);
        if (dto.Grants == null || dto.Grants.Any(x => x == null || x.DepartmentIds == null)
            || dto.Grants.Select(x => x.Permission).Distinct().Count() != dto.Grants.Count)
            throw new AccessException("操作授权列表无效或包含重复项", 400);
        var infos = await store.Select<CrudInfo>().Where(x => !x.IsDeleted && x.AppsId == role.AppsId && x.NodeType == "Operation").ToListAsync();
        foreach (var grant in dto.Grants)
        {
            if (role.AppsId == current.BackendAppId) ResourceSecurityCatalog.ValidateGrant(grant.Permission, grant.ScopeType, grant.DepartmentIds);
            else if (!Enum.IsDefined(grant.ScopeType)) throw new AccessException("数据范围无效", 400);
            if (infos.Count(x => x.CrudCode == grant.Permission) != 1) throw new AccessException("操作不属于该角色应用", 400);
            if (grant.ScopeType == DataScopeType.CustomDepartments ? grant.DepartmentIds.Count == 0 : grant.DepartmentIds.Count != 0)
                throw new AccessException("指定部门与范围类型不一致", 400);
            foreach (var department in grant.DepartmentIds.Distinct()) await guard.RequireDepartmentAsync(department);
        }
        var oldIds = await store.Select<CrudRoleCrud>().Where(x => x.CrudRoleId == id && !x.IsDeleted).ToListAsync(x => x.Id);
        await store.Delete<GrantDepartment>().Where(x => oldIds.Contains(x.GrantId)).ExecuteAffrowsAsync();
        await store.Update<CrudRoleCrud>().Where(x => x.CrudRoleId == id && !x.IsDeleted).Set(x => x.IsDeleted, true)
            .Set(x => x.DeleterId, current.UserId).Set(x => x.DeleteTime, DateTime.UtcNow).ExecuteAffrowsAsync();
        foreach (var grant in dto.Grants)
        {
            var entity = new CrudRoleCrud { CrudRoleId = id, CrudInfoId = infos.Single(x => x.CrudCode == grant.Permission).Id,
                TenantId = current.TenantId, AppsId = role.AppsId, ScopeType = grant.ScopeType.ToString(),
                CreatorId = current.UserId, CreatorNic = current.NickName, CreateTime = DateTime.UtcNow };
            entity.Id = await store.Insert(entity).ExecuteIdentityAsync();
            foreach (var department in grant.DepartmentIds)
                await store.Insert(new GrantDepartment { GrantId = entity.Id, DepartmentId = department, TenantId = current.TenantId!.Value }).ExecuteAffrowsAsync();
        }
        await store.BumpTenantAsync(current.TenantId!.Value);
        await store.AuditAsync("auth.roles.permissions", "CrudRole", id,
            summary: new { permissions = dto.Grants.Select(x => new { x.Permission, scope = x.ScopeType.ToString(), x.DepartmentIds }) });
    });

    public async Task<IReadOnlyList<long>> GetUserRolesAsync(long userId, long appId)
    {
        var current = RequireManager();
        await guard.RequireUserAsync(userId); await guard.RequireAppAsync(appId, allowBackend: true);
        var businessRoles = await store.Select<CrudRole>().Where(x => !x.IsDeleted && x.TenantId == current.TenantId
            && x.AppsId == appId && x.RoleKind == ResourceSecurityCatalog.BusinessRole).ToListAsync(x => x.Id);
        return await store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.UserId == userId && x.TenantId == current.TenantId
            && x.AppsId == appId && businessRoles.Contains(x.RoleId)).ToListAsync(x => x.RoleId);
    }

    public Task SaveUserRolesAsync(long userId, SaveUserRolesDto dto) => store.WriteAsync(async () =>
    {
        var current = RequireManager();
        await guard.RequireUserAsync(userId); await guard.RequireAppAsync(dto.AppsId, allowBackend: true);
        if (await guard.IsTenantAdministratorAsync(userId)) throw new AccessException("普通授权入口不能修改管理员授权");
        if (dto.RoleIds == null || dto.RoleIds.Distinct().Count() != dto.RoleIds.Count) throw new AccessException("角色列表无效或包含重复项", 400);
        foreach (var id in dto.RoleIds)
        {
            var role = await guard.RequireRoleAsync(id);
            if (role.AppsId != dto.AppsId) throw new AccessException("不能分配其他应用的角色", 400);
        }
        var existing = await store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.UserId == userId
            && x.TenantId == current.TenantId && x.AppsId == dto.AppsId).ToListAsync();
        foreach (var link in existing) await guard.RequireRoleAsync(link.RoleId);
        await store.Update<CrudRoleUser>().Where(x => !x.IsDeleted && x.UserId == userId && x.TenantId == current.TenantId && x.AppsId == dto.AppsId)
            .Set(x => x.IsDeleted, true).Set(x => x.DeleterId, current.UserId).Set(x => x.DeleteTime, DateTime.UtcNow).ExecuteAffrowsAsync();
        foreach (var roleId in dto.RoleIds)
            await store.Insert(new CrudRoleUser { UserId = userId, RoleId = roleId, TenantId = current.TenantId, AppsId = dto.AppsId,
                CreatorId = current.UserId, CreatorNic = current.NickName, CreateTime = DateTime.UtcNow }).ExecuteAffrowsAsync();
        await store.BumpTenantAsync(current.TenantId!.Value);
        await store.AuditAsync("auth.users.roles", "User", userId, summary: new { dto.AppsId, dto.RoleIds });
    });

    AccessSnapshot RequireManager()
    {
        var current = access.Require();
        if (!current.IsTenantManager || current.MustChangePassword) throw new AccessException("仅租户管理身份可维护授权");
        return current;
    }
}
