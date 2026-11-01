using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.Auth;

public interface IAuthLoginService : IService
{
    Task<LoginResultDto> LoginAsync(LoginDto dto);
    Task ChangePasswordAsync(ChangePasswordDto dto);
}
