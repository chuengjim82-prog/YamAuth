using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/crud-role-users")]
[Authorize]
public partial class CrudRoleUsersController : ControllerBase
{
    private readonly ICrudRoleUserService _svc;
    public CrudRoleUsersController(ICrudRoleUserService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<CrudRoleUserDto>> Page([FromQuery] CrudRoleUserQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<CrudRoleUserDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] CrudRoleUserCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] CrudRoleUserUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
