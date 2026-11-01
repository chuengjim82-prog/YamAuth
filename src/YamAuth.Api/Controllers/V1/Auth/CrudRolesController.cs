using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/crud-roles")]
[Authorize]
public partial class CrudRolesController : ControllerBase
{
    private readonly ICrudRoleService _svc;
    public CrudRolesController(ICrudRoleService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<CrudRoleDto>> Page([FromQuery] CrudRoleQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<CrudRoleDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] CrudRoleCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] CrudRoleUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
