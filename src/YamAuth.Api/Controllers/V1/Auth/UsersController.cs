using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/users")]
public partial class UsersController : ControllerBase
{
    private readonly IUserService _svc;
    public UsersController(IUserService svc) => _svc = svc;

    [HttpGet, RequirePermission("auth.users.read")]
    public Task<PagedResult<UserDto>> Page([FromQuery] UserQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("auth.users.read")]
    public Task<UserDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("auth.users.create")]
    public Task<long> Create([FromBody] UserCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("auth.users.update")]
    public Task Update(long id, [FromBody] UserUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("auth.users.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
