using YamAuth.Dtos.Auth;

namespace YamAuth.Migrations;

/// <summary>经人工确认的初始映射。没有列出的旧记录保持隔离，绝不从旧 IsAdmin 或角色名称推导权限。</summary>
public sealed class MigrationManifest
{
    public string Database { get; set; } = "";
    public List<UserMapping> Users { get; set; } = new();
    public List<DepartmentMapping> Departments { get; set; } = new();
    public List<EmployeeMapping> Employees { get; set; } = new();
    public List<OwnerMapping> Owners { get; set; } = new();
    public List<AppMapping> Apps { get; set; } = new();
    public List<RoleMapping> Roles { get; set; } = new();
}
public sealed record UserMapping(long Id, long? TenantId, bool PlatformAdministrator, bool TenantAdministrator);
public sealed record EmployeeMapping(long Id, long TenantId, long? UserId, long? DepartmentId);
public sealed record OwnerMapping(string Resource, long Id, long TenantId, long OwnerUserId, long? OwnerDepartmentId);
public sealed record AppMapping(long Id, long TenantId);
public sealed record RoleMapping(long Id, long TenantId, long? AppsId, IReadOnlyList<RoleGrantDto> Grants, IReadOnlyList<long> UserIds);
public sealed record InspectionIssue(string Resource, long Id, string Reason);
public sealed record InspectionReport(string Database, IReadOnlyDictionary<string, long> Counts, IReadOnlyList<InspectionIssue> Issues, bool Applied);

public sealed record DepartmentMapping(long Id, long TenantId);
