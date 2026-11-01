using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YamAuth.Service.Auth;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth")]
public class LoginController : ControllerBase
{
    private readonly IAuthLoginService _svc;
    public LoginController(IAuthLoginService svc) => _svc = svc;

    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("login")]
    public Task<LoginResultDto> Login([FromBody] LoginDto dto) => _svc.LoginAsync(dto);

    [HttpPost("change-password"), Authorize]
    public Task ChangePassword([FromBody] ChangePasswordDto dto) => _svc.ChangePasswordAsync(dto);
}
