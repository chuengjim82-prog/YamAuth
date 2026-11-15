using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/tenants")]
public partial class TenantsController : ControllerBase
{
    private readonly ITenantService _svc;
    public TenantsController(ITenantService svc) => _svc = svc;

    [HttpGet, RequirePermission("auth.tenants.read")]
    public Task<PagedResult<TenantDto>> Page([FromQuery] TenantQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("auth.tenants.read")]
    public Task<TenantDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("auth.tenants.create")]
    public Task<long> Create([FromBody] TenantCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("auth.tenants.update")]
    public Task Update(long id, [FromBody] TenantUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("auth.tenants.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
