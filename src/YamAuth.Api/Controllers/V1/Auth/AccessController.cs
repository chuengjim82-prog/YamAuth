using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Authorization;
using YamAuth.Authorization;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Authorization;
using YamAuth.Service.Authorization;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth")]
public sealed class AccessController(AccessService service, AccountService accounts, PermissionManagementService permissions,
    CandidateService candidates, SecurityStore store, AccessContext access) : ControllerBase
{
    [HttpGet("me"), AccessPolicy("self:me")]
    public Task<MeDto> Me() => service.MeAsync();
    [HttpGet("access"), AccessPolicy("self:access")]
    public Task<AccessDto> Access() => service.GetAccessAsync();
    [HttpPut("me/profile"), AccessPolicy("self:profile")]
    public Task Profile(ProfileUpdateDto dto) => accounts.UpdateProfileAsync(dto);
    [HttpPut("me/email"), AccessPolicy("self:email")]
    public Task Email(EmailChangeDto dto) => accounts.ChangeEmailAsync(dto);
    [HttpPost("logout"), AccessPolicy("self:logout")]
    public Task Logout() => accounts.LogoutAsync();
    [HttpPost("users/{id:long}/reset-password"), RequirePermission("auth.users.reset_password")]
    public Task ResetPassword(long id, ResetPasswordDto dto) => accounts.ResetPasswordAsync(id, dto);
    [HttpPut("users/{id:long}/status"), RequirePermission("auth.users.disable")]
    public Task Status(long id, UserStatusDto dto) => accounts.SetStatusAsync(id, dto);
    [HttpGet("permission-catalog"), AccessPolicy("tenant-manager")]
    public Task<IReadOnlyList<PermissionOptionDto>> Catalog([FromQuery] long appsId) => permissions.CatalogAsync(appsId);
    [HttpGet("crud-roles/{id:long}/permissions"), AccessPolicy("tenant-manager")]
    public Task<IReadOnlyList<RoleGrantDto>> RolePermissions(long id) => permissions.GetGrantsAsync(id);
    [HttpPut("crud-roles/{id:long}/permissions"), AccessPolicy("tenant-manager")]
    public Task RolePermissions(long id, SaveRoleGrantsDto dto) => permissions.SaveGrantsAsync(id, dto);
    [HttpGet("users/{id:long}/roles"), AccessPolicy("tenant-manager")]
    public Task<IReadOnlyList<long>> UserRoles(long id, [FromQuery] long appsId) => permissions.GetUserRolesAsync(id, appsId);
    [HttpPut("users/{id:long}/roles"), AccessPolicy("tenant-manager")]
    public Task UserRoles(long id, SaveUserRolesDto dto) => permissions.SaveUserRolesAsync(id, dto);
    [HttpGet("candidates"), AccessPolicy("self:candidates")]
    public Task<PagedResult<CandidateDto>> Candidates([FromQuery] CandidateQueryDto dto) => candidates.QueryAsync(dto);
    [HttpPost("tenant-contexts"), AccessPolicy("platform")]
    public Task<TenantContextDto> Enter(EnterTenantDto dto) => accounts.EnterTenantAsync(dto);
    [HttpDelete("tenant-contexts/{id:guid}"), AccessPolicy("platform")]
    public Task Exit(Guid id) => accounts.ExitTenantAsync(id);
    [HttpGet("administrators"), AccessPolicy("platform")]
    public Task<PagedResult<UserDto>> Administrators([FromQuery] PagedQuery query) => accounts.AdministratorsAsync(query);
    [HttpPost("administrators"), AccessPolicy("platform")]
    public Task<long> CreateAdministrator(UserCreateDto dto) => accounts.CreatePlatformAdministratorAsync(dto);
    [HttpPut("administrators/{id:long}"), AccessPolicy("platform")]
    public Task UpdateAdministrator(long id, UserUpdateDto dto) => accounts.UpdateAdministratorAsync(id, dto);
    [HttpPut("users/{id:long}/tenant-administrator"), AccessPolicy("platform")]
    public Task Appoint(long id, AdministratorDto dto) => accounts.SetTenantAdministratorAsync(id, dto);
    [HttpPost("administrators/{id:long}/reset-password"), AccessPolicy("platform")]
    public Task ResetAdministrator(long id, ResetPasswordDto dto) => accounts.ResetPasswordAsync(id, dto, true);
    [HttpPut("administrators/{id:long}/status"), AccessPolicy("platform")]
    public Task AdministratorStatus(long id, UserStatusDto dto) => accounts.SetStatusAsync(id, dto, true);
    [HttpDelete("administrators/{id:long}"), AccessPolicy("platform")]
    public Task DeleteAdministrator(long id) => accounts.DeleteAdministratorAsync(id);

    [HttpGet("audit"), AccessPolicy("audit")]
    public async Task<PagedResult<AuditEventDto>> Audit([FromQuery] PagedQuery query)
    {
        var current = access.Require();
        var select = store.Select<AuditEvent>();
        if (current.TenantId != null) select = select.Where(x => x.TenantId == current.TenantId);
        else if (!current.IsPlatformAdmin) throw new AccessException("没有查询审计的权限");
        var keyword = query.Keyword?.Trim();
        if (!string.IsNullOrEmpty(keyword)) select = select.Where(x => x.Action.Contains(keyword) || x.TargetType.Contains(keyword));
        var total = await select.CountAsync();
        var rows = await select.OrderByDescending(x => x.CreatedAt).OrderBy(x => x.Id).Page(query.Page, query.Size).ToListAsync();
        return new() { Total = total, Items = rows.Select(x => new AuditEventDto(x.Id, x.UserId, x.TenantId, x.Action,
            x.TargetType, x.TargetId, x.Result, x.CreatedAt, x.TraceId, x.Summary)).ToList() };
    }
}
