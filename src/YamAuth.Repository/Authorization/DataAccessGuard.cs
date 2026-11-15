using FreeSql;
using YamAuth.Authorization;
using YamAuth.Entity.Abstractions;
using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.Authorization;

public sealed partial class DataAccessGuard(AccessContext access, SecurityStore store)
{
    public AccessContext Access { get; } = access;
    public SecurityStore Store { get; } = store;

    public ISelect<T> Select<T>(IFreeSql orm, string? permission = null) where T : class, IAuditEntity, new()
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        var operation = permission ?? Access.RequireOperation();
        if (!operation.StartsWith(rule.Key + ".", StringComparison.Ordinal))
            throw new AccessException("不能借用其他资源的权限读取数据");
        Access.Demand(operation);
        return orm.Select<T>().WithTransaction(Store.Transaction).Where(Predicate(rule, operation));
    }

    public string Predicate(ResourceRule rule, string permission)
    {
        var current = Access.Require();
        var scope = current.Scope(permission);
        if (scope.IsEmpty) return "1 = 0";
        var tenant = current.TenantId.GetValueOrDefault();
        var apps = AppIds(current);
        var roles = $"SELECT [Id] FROM [tb_Auth_CrudRole] WHERE [IsDeleted] = 0 AND [TenantId] = {tenant} AND ([AppsId] = {current.BackendAppId} OR [AppsId] IN ({apps}))";
        var tenantUsers = $"SELECT [Id] FROM [tb_Auth_User] WHERE [IsDeleted] = 0 AND [SecurityReady] = 1 AND [TenantId] = {tenant} AND [IsAdmin] = 0";
        var conditions = new List<string> { "[IsDeleted] = 0" };
        switch (rule.Entity)
        {
            case "Tenant": break;
            case "AppsInfo": conditions.Add($"[Id] IN ({apps})"); break;
            case "CrudInfo": case "CrudMenu": conditions.Add($"[AppsId] IN ({apps})"); break;
            case "CrudItem": conditions.Add($"[CrudId] IN (SELECT [Id] FROM [tb_Auth_CrudInfo] WHERE [IsDeleted] = 0 AND [AppsId] IN ({apps}))"); break;
            case "CrudRoleCrud":
                conditions.Add($"[AppsId] IS NOT NULL AND [TenantId] = {tenant} AND [CrudRoleId] IN ({roles}) AND [CrudInfoId] IN (SELECT [Id] FROM [tb_Auth_CrudInfo] WHERE [IsDeleted] = 0 AND ([AppsId] = {current.BackendAppId} OR [AppsId] IN ({apps})))");
                break;
            case "CrudRoleUser":
                conditions.Add($"[AppsId] IS NOT NULL AND [TenantId] = {tenant} AND [RoleId] IN ({roles}) AND [UserId] IN ({tenantUsers})"); break;
            case "DataRoleUser":
                conditions.Add($"[RoleId] IN (SELECT [Id] FROM [tb_Auth_DataRole] WHERE [IsDeleted] = 0 AND [TenantId] = {tenant} AND [AppsId] IN ({apps})) AND [UserId] IN ({tenantUsers})"); break;
            default: conditions.Add($"[TenantId] = {tenant}"); break;
        }
        if (rule.Entity == "AppsUser") conditions.Add($"[UserId] IN ({tenantUsers})");
        if (rule.Entity is "CrudRoleUser" or "CrudRoleCrud" && !permission.EndsWith(".read", StringComparison.Ordinal))
        {
            var roleColumn = rule.Entity == "CrudRoleUser" ? "RoleId" : "CrudRoleId";
            conditions.Add($"[{roleColumn}] IN (SELECT [Id] FROM [tb_Auth_CrudRole] WHERE [RoleKind] = 'Business')");
            if (rule.Entity == "CrudRoleUser") conditions.Add($"[UserId] NOT IN (SELECT ru.[UserId] FROM [tb_Auth_CrudRoleUser] ru JOIN [tb_Auth_CrudRole] r ON ru.[RoleId] = r.[Id] WHERE ru.[IsDeleted] = 0 AND r.[IsDeleted] = 0 AND ru.[TenantId] = {tenant} AND r.[TenantId] = {tenant} AND ru.[AppsId] = {current.BackendAppId} AND r.[AppsId] = {current.BackendAppId} AND r.[RoleKind] = 'TenantAdministrator')");
        }
        if (rule.Entity == "User")
        {
            conditions.Add("[SecurityReady] = 1 AND [IsAdmin] = 0");
            if (!current.IsTenantManager || !permission.EndsWith(".read", StringComparison.Ordinal))
                conditions.Add($"[Id] NOT IN (SELECT ru.[UserId] FROM [tb_Auth_CrudRoleUser] ru INNER JOIN [tb_Auth_CrudRole] r ON ru.[RoleId] = r.[Id] WHERE ru.[IsDeleted] = 0 AND r.[IsDeleted] = 0 AND ru.[TenantId] = {tenant} AND ru.[AppsId] = {current.BackendAppId} AND r.[TenantId] = {tenant} AND r.[AppsId] = {current.BackendAppId} AND r.[RoleKind] = 'TenantAdministrator')");
        }
        if (rule.Entity == "Employee" && !current.IsPlatformAdmin
            && (!current.IsTenantManager || !permission.EndsWith(".read", StringComparison.Ordinal)))
        {
            var protectedUsers = $"SELECT ru.[UserId] FROM [tb_Auth_CrudRoleUser] ru JOIN [tb_Auth_CrudRole] r ON ru.[RoleId] = r.[Id] WHERE ru.[IsDeleted] = 0 AND r.[IsDeleted] = 0 AND ru.[TenantId] = {tenant} AND r.[TenantId] = {tenant} AND ru.[AppsId] = {current.BackendAppId} AND r.[AppsId] = {current.BackendAppId} AND r.[RoleKind] = 'TenantAdministrator'";
            conditions.Add(current.IsTenantManager
                ? $"([UserId] IS NULL OR [UserId] = {current.UserId} OR [UserId] NOT IN ({protectedUsers}))"
                : $"([UserId] IS NULL OR [UserId] NOT IN ({protectedUsers}))");
        }
        if (rule.Entity is "CrudRole" or "AppsUser" or "DataRole")
        {
            conditions.Add(rule.Entity == "CrudRole"
                ? $"([AppsId] = {current.BackendAppId} OR [AppsId] IN ({apps}))" : $"[AppsId] IN ({apps})");
            if (rule.Entity == "CrudRole" && !permission.EndsWith(".read", StringComparison.Ordinal)) conditions.Add("[RoleKind] = 'Business'");
        }
        if (rule.Kind is ResourceKind.Owned or ResourceKind.Employee && !current.IsTenantManager)
            conditions.Add("[OwnershipConfirmed] = 1");
        if (!scope.TenantAll)
        {
            var any = new List<string>();
            var owner = rule.Kind switch { ResourceKind.User => "Id", ResourceKind.Employee => "UserId", ResourceKind.Owned => "OwnerUserId", _ => null };
            if (scope.Self && owner != null) any.Add($"[{owner}] = {current.UserId}");
            if (scope.DepartmentIds.Count > 0)
            {
                var departments = string.Join(",", scope.DepartmentIds.Order());
                any.Add(rule.Kind switch
                {
                    ResourceKind.User => $"[Id] IN (SELECT [UserId] FROM [tb_Unit_Employee] WHERE [TenantId] = {tenant} AND [IsDeleted] = 0 AND [OwnershipConfirmed] = 1 AND [DepartmentId] IN ({departments}))",
                    ResourceKind.Employee => $"[DepartmentId] IN ({departments})",
                    ResourceKind.Owned => $"[OwnerDepartmentId] IN ({departments})",
                    _ => "1 = 0"
                });
            }
            conditions.Add(any.Count == 0 ? "1 = 0" : "(" + string.Join(" OR ", any) + ")");
        }
        // 条件仅由固定列名和服务端校验后的整数构建，客户端不能提交 SQL 条件。
        return string.Join(" AND ", conditions);
    }

    string AppIds(AccessSnapshot current) => current.IsPlatformAdmin && current.TenantId == null
        ? $"SELECT [Id] FROM [tb_Auth_AppsInfo] WHERE [Id] = {current.BackendAppId} AND [AppKind] = 'Backend' AND [IsDeleted] = 0"
        : $"SELECT [Id] FROM [tb_Auth_AppsInfo] WHERE [TenantId] = {current.TenantId.GetValueOrDefault()} AND [AppKind] = 'Tenant' AND [IsDeleted] = 0";

    public async Task DecorateAsync<T>(IFreeSql orm, IReadOnlyList<T> items) where T : class, IAuditEntity, new()
    {
        if (items.Count == 0) return;
        var property = typeof(T).GetProperty("AllowedActions")!;
        var actions = items.ToDictionary(x => x.Id, _ => new List<string>());
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        var ids = items.Select(x => x.Id).ToArray();
        foreach (var permission in ResourceSecurityCatalog.Permissions.Where(x => x.Resource == rule && x.Action != "read"))
        {
            if (!Access.Require().Can(permission.Code)) continue;
            var permitted = await Select<T>(orm, permission.Code).Where(x => ids.Contains(x.Id)).ToListAsync(x => x.Id);
            foreach (var id in permitted) actions[id].Add(permission.Action);
        }
        foreach (var item in items) property.SetValue(item, actions[item.Id].ToArray());
        await FillLabelsAsync(items);
    }
}
