using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/apps-users")]
public partial class AppsUsersController : ControllerBase
{
    private readonly IAppsUserService _svc;
    public AppsUsersController(IAppsUserService svc) => _svc = svc;

    [HttpGet, RequirePermission("auth.apps-users.read")]
    public Task<PagedResult<AppsUserDto>> Page([FromQuery] AppsUserQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("auth.apps-users.read")]
    public Task<AppsUserDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("auth.apps-users.create")]
    public Task<long> Create([FromBody] AppsUserCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("auth.apps-users.update")]
    public Task Update(long id, [FromBody] AppsUserUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("auth.apps-users.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
