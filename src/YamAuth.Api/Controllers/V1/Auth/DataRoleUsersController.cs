using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/data-role-users")]
[Authorize]
public partial class DataRoleUsersController : ControllerBase
{
    private readonly IDataRoleUserService _svc;
    public DataRoleUsersController(IDataRoleUserService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<DataRoleUserDto>> Page([FromQuery] DataRoleUserQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<DataRoleUserDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] DataRoleUserCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] DataRoleUserUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
