using YamAuth.Authorization;

namespace YamAuth.Dtos.Auth;

public sealed record MeDto(long Id, string UserName, string NickName, string Avatar, string Phone, string Email,
    string Identity, bool MustChangePassword, long? AccountTenantId, long? TenantId, string? TenantName, Guid? ContextId);
public sealed record EffectivePermissionDto(string Code, bool Self, bool TenantAll, long[] DepartmentIds);
public sealed record AccessDto(MeDto Me, long AppsId, long AuthorizationVersion, long CatalogVersion,
    IReadOnlyList<EffectivePermissionDto> Permissions, IReadOnlyList<MenuTreeDto> Menus);
public sealed record ProfileUpdateDto(string NickName, string Avatar, string Phone);
public sealed record EmailChangeDto(string Email, string Password);
public sealed record ResetPasswordDto(string Password);
public sealed record UserStatusDto(bool IsActived);
public sealed record AdministratorDto(bool IsAdministrator);
public sealed record EnterTenantDto(long TenantId);
public sealed record TenantContextDto(Guid Id, long TenantId, DateTime ExpiresAt);
public sealed record EmployeeAssignmentDto(long? UserId, long? DepartmentId);
public sealed record OwnershipTransferDto(long OwnerUserId, long? OwnerDepartmentId);
public sealed record RoleGrantDto(string Permission, DataScopeType ScopeType, IReadOnlyList<long> DepartmentIds);
public sealed record SaveRoleGrantsDto(IReadOnlyList<RoleGrantDto> Grants);
public sealed record SaveUserRolesDto(long AppsId, IReadOnlyList<long> RoleIds);
public sealed record PermissionOptionDto(string Code, string Name, string Resource, IReadOnlyList<DataScopeType> SupportedScopes);
public sealed record CandidateDto(long Id, string Label);
public sealed class CandidateQueryDto : YamAuth.Dtos.PagedQuery
{
    public string Purpose { get; set; } = "";
    public string Kind { get; set; } = "";
    public long? TargetId { get; set; }
    public long? AppsId { get; set; }
    public long[] Ids { get; set; } = Array.Empty<long>();
}
public sealed record AuditEventDto(Guid Id, long? UserId, long? TenantId, string Action, string TargetType,
    string? TargetId, string Result, DateTime CreatedAt, string TraceId, string Summary);
