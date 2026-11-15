namespace YamAuth.Authorization;

public enum ResourceKind { User, Employee, Owned, Platform, TenantManagement, Definition, RoleLink, LegacyRoleLink }

public sealed record ResourceRule(string Key, string Entity, string Table, string Name, ResourceKind Kind)
{
    public string Route => "/api/v1/" + Key.Replace('.', '/');
}

public sealed record PermissionRule(ResourceRule Resource, string Action, string Name,
    bool Assignable, IReadOnlyList<DataScopeType> SupportedScopes)
{
    public string Code => Resource.Key + "." + Action;
}

/// <summary>代码是内置接口权限的权威来源；数据库路径和可编辑角色名称均不能改变此清单。</summary>
public static class ResourceSecurityCatalog
{
    public const string BackendCode = "yamauth.backend";
    public const string BackendKind = "Backend";
    public const string TenantAppKind = "Tenant";
    public const string TenantAdministrator = "TenantAdministrator";
    public const string BusinessRole = "Business";
    public const string ContextHeader = "X-YamAuth-Context";

    public static IReadOnlyList<ResourceRule> Resources { get; } = new ResourceRule[]
    {
        new("auth.users", "User", "tb_Auth_User", "用户", ResourceKind.User),
        new("auth.tenants", "Tenant", "tb_Auth_Tenant", "租户", ResourceKind.Platform),
        new("auth.apps-infos", "AppsInfo", "tb_Auth_AppsInfo", "应用", ResourceKind.Definition),
        new("auth.apps-users", "AppsUser", "tb_Auth_AppsUser", "应用用户", ResourceKind.TenantManagement),
        new("auth.crud-infos", "CrudInfo", "tb_Auth_CrudInfo", "功能", ResourceKind.Definition),
        new("auth.crud-items", "CrudItem", "tb_Auth_CrudItem", "功能接口", ResourceKind.Definition),
        new("auth.crud-menus", "CrudMenu", "tb_Auth_CrudMenu", "菜单", ResourceKind.Definition),
        new("auth.crud-roles", "CrudRole", "tb_Auth_CrudRole", "角色", ResourceKind.TenantManagement),
        new("auth.crud-role-cruds", "CrudRoleCrud", "tb_Auth_CrudRoleCrud", "角色操作", ResourceKind.RoleLink),
        new("auth.crud-role-users", "CrudRoleUser", "tb_Auth_CrudRoleUser", "角色用户", ResourceKind.RoleLink),
        new("auth.data-roles", "DataRole", "tb_Auth_DataRole", "历史数据角色", ResourceKind.TenantManagement),
        new("auth.data-role-users", "DataRoleUser", "tb_Auth_DataRoleUser", "历史数据角色用户", ResourceKind.LegacyRoleLink),
        new("unit.departments", "Department", "tb_Unit_Department", "部门", ResourceKind.TenantManagement),
        new("unit.employees", "Employee", "tb_Unit_Employee", "员工", ResourceKind.Employee),
        new("bzss.companies", "Company", "tb_Bzss_Company", "公司", ResourceKind.Owned),
        new("bzss.projects", "Project", "tb_Bzss_Project", "项目", ResourceKind.Owned)
    };

    public static IReadOnlyList<PermissionRule> Permissions { get; } = BuildPermissions();
    public static ResourceRule Entity(string entity) => Resources.SingleOrDefault(x => x.Entity == entity)
        ?? throw new AccessException($"资源 {entity} 未登记安全规则");
    public static ResourceRule? Find(string key) => Resources.SingleOrDefault(x => x.Key == key);
    public static PermissionRule? Permission(string code) => Permissions.SingleOrDefault(x => x.Code == code);

    public static void ValidateGrant(string code, DataScopeType scope, IReadOnlyList<long> departments)
    {
        var permission = Permission(code);
        if (permission is not { Assignable: true } || !permission.SupportedScopes.Contains(scope))
            throw new AccessException("该操作或数据范围不能授予普通角色", 400);
        if (scope == DataScopeType.CustomDepartments ? departments.Count == 0 || departments.Any(x => x <= 0)
            : departments.Count != 0)
            throw new AccessException("指定部门与范围类型不一致", 400);
        if (departments.Distinct().Count() != departments.Count)
            throw new AccessException("指定部门不能重复", 400);
    }

    static IReadOnlyList<PermissionRule> BuildPermissions()
    {
        var result = new List<PermissionRule>();
        foreach (var resource in Resources)
        {
            var actions = new List<(string, string)> { ("read", "查看"), ("create", "新增"), ("update", "修改"), ("delete", "删除") };
            if (resource.Kind == ResourceKind.User) actions.AddRange(new[] { ("disable", "启停"), ("reset_password", "重置密码") });
            if (resource.Kind == ResourceKind.Employee) actions.Add(("assignment", "维护组织关系"));
            if (resource.Kind == ResourceKind.Owned) actions.Add(("transfer", "转移归属"));
            foreach (var (action, name) in actions)
            {
                var assignable = resource.Kind is ResourceKind.User or ResourceKind.Owned
                    || resource.Kind == ResourceKind.Employee && action is "read" or "update";
                var scopes = resource.Kind == ResourceKind.User && action == "create"
                    ? new[] { DataScopeType.TenantAll } : Enum.GetValues<DataScopeType>();
                result.Add(new(resource, action, name + resource.Name, assignable,
                    assignable ? scopes : new[] { DataScopeType.TenantAll }));
            }
        }
        return result;
    }

    /// <summary>这些表仅通过专用服务访问，生成器不得为其生成管理 CRUD。</summary>
    public static IReadOnlySet<string> InternalTables { get; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "tb_Auth_LoginSession", "tb_Auth_TenantContext", "tb_Auth_LoginIdentifier", "tb_Auth_GrantDepartment",
        "tb_Auth_AuditEvent", "tb_Auth_AuditOutbox", "tb_Auth_MigrationIssue", "tb_Auth_SchemaVersion"
    };
}
