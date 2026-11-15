using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Service.Authorization;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth")]
public class RbacController(AccessService service) : ControllerBase
{
    [HttpGet("menus"), AccessPolicy("self:access")]
    public Task<List<MenuTreeDto>> Menus() => service.MenusAsync();
}
