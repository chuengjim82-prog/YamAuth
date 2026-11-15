using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/apps-infos")]
public partial class AppsInfosController : ControllerBase
{
    private readonly IAppsInfoService _svc;
    public AppsInfosController(IAppsInfoService svc) => _svc = svc;

    [HttpGet, RequirePermission("auth.apps-infos.read")]
    public Task<PagedResult<AppsInfoDto>> Page([FromQuery] AppsInfoQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("auth.apps-infos.read")]
    public Task<AppsInfoDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("auth.apps-infos.create")]
    public Task<long> Create([FromBody] AppsInfoCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("auth.apps-infos.update")]
    public Task Update(long id, [FromBody] AppsInfoUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("auth.apps-infos.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
