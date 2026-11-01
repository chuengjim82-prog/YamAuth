using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Service.YamBase.Auth;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth")]
[Authorize]
public class RbacController : ControllerBase
{
    private readonly IMenuTreeService _menu;
    public RbacController(IMenuTreeService menu) => _menu = menu;

    [HttpGet("menus")]
    public Task<List<MenuTreeDto>> Menus() => _menu.GetMenuTreeAsync();
}
