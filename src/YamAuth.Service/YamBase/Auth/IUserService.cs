using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface IUserService : IService
{
    Task<UserDto?> GetAsync(long id);
    Task<PagedResult<UserDto>> PageAsync(UserQueryDto q);
    Task<long> CreateAsync(UserCreateDto dto);
    Task UpdateAsync(long id, UserUpdateDto dto);
    Task DeleteAsync(long id);
}
