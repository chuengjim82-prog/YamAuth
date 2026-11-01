using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/data-roles")]
[Authorize]
public partial class DataRolesController : ControllerBase
{
    private readonly IDataRoleService _svc;
    public DataRolesController(IDataRoleService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<DataRoleDto>> Page([FromQuery] DataRoleQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<DataRoleDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] DataRoleCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] DataRoleUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
