using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/crud-infos")]
public partial class CrudInfosController : ControllerBase
{
    private readonly ICrudInfoService _svc;
    public CrudInfosController(ICrudInfoService svc) => _svc = svc;

    [HttpGet, RequirePermission("auth.crud-infos.read")]
    public Task<PagedResult<CrudInfoDto>> Page([FromQuery] CrudInfoQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("auth.crud-infos.read")]
    public Task<CrudInfoDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("auth.crud-infos.create")]
    public Task<long> Create([FromBody] CrudInfoCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("auth.crud-infos.update")]
    public Task Update(long id, [FromBody] CrudInfoUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("auth.crud-infos.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
