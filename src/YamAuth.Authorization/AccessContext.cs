using System.Text.Json.Serialization;

namespace YamAuth.Authorization;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DataScopeType { Self, Department, CustomDepartments, TenantAll }

public sealed record OperationGrant(string Permission, DataScopeType ScopeType, IReadOnlyList<long> DepartmentIds);

public sealed record EffectiveScope(bool Self, bool TenantAll, IReadOnlySet<long> DepartmentIds)
{
    public static EffectiveScope None { get; } = new(false, false, new HashSet<long>());
    public static EffectiveScope All { get; } = new(false, true, new HashSet<long>());
    public bool IsEmpty => !Self && !TenantAll && DepartmentIds.Count == 0;

    /// <summary>只合并同一操作；没有有效部门的 Department 授权不产生任何部门范围。</summary>
    public static EffectiveScope Merge(string permission, IEnumerable<OperationGrant> grants, long? departmentId)
    {
        var self = false;
        var all = false;
        var departments = new HashSet<long>();
        foreach (var grant in grants.Where(x => x.Permission == permission))
        {
            switch (grant.ScopeType)
            {
                case DataScopeType.Self: self = true; break;
                case DataScopeType.TenantAll: all = true; break;
                case DataScopeType.Department when departmentId is > 0: departments.Add(departmentId.Value); break;
                case DataScopeType.CustomDepartments:
                    foreach (var id in grant.DepartmentIds.Where(x => x > 0)) departments.Add(id);
                    break;
            }
        }
        return new(self, all, departments);
    }
}

/// <summary>由服务端状态构建的请求快照；不从客户端或 JWT 权限声明恢复授权。</summary>
public sealed record AccessSnapshot(
    long UserId, string UserName, string NickName, Guid SessionId, long SecurityVersion,
    bool IsPlatformAdmin, bool IsTenantAdmin, bool MustChangePassword,
    long? AccountTenantId, long? TenantId, string? TenantName, long? DepartmentId,
    long BackendAppId, long AuthorizationVersion, long CatalogVersion, Guid? ContextId,
    IReadOnlyList<OperationGrant> Grants)
{
    public bool IsTenantManager => TenantId is > 0 && (IsPlatformAdmin || IsTenantAdmin);

    public EffectiveScope Scope(string permission)
    {
        if (MustChangePassword) return EffectiveScope.None;
        var rule = ResourceSecurityCatalog.Permission(permission);
        if (rule == null) return EffectiveScope.None;
        if (rule.Resource.Kind == ResourceKind.Platform)
            return IsPlatformAdmin ? EffectiveScope.All : EffectiveScope.None;
        if (rule.Resource.Kind == ResourceKind.Definition && IsPlatformAdmin && TenantId == null)
            return rule.Resource.Entity == "AppsInfo" && rule.Action is "create" or "delete" ? EffectiveScope.None : EffectiveScope.All;
        if (TenantId is not > 0) return EffectiveScope.None;
        if (IsTenantManager) return EffectiveScope.All;
        if (!rule.Assignable) return EffectiveScope.None;
        return EffectiveScope.Merge(permission, Grants, DepartmentId);
    }

    public bool Can(string permission) => !Scope(permission).IsEmpty;
}

/// <summary>仅在当前请求内使用，不能存放于单例 FreeSql 或跨请求静态字段。</summary>
public sealed class AccessContext
{
    public AccessSnapshot? Snapshot { get; set; }
    public string? Operation { get; set; }
    public byte[]? ExpectedVersion { get; set; }
    public string TraceId { get; set; } = "";
    public AccessSnapshot Require() => Snapshot ?? throw new AccessException("请先登录", 401);
    public string RequireOperation() => Operation ?? throw new AccessException("接口未声明操作权限");
    public void Demand(string permission)
    {
        if (!Require().Can(permission)) throw new AccessException("没有执行该操作的权限");
    }
}
