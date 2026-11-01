using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface IAppsUserService : IService
{
    Task<AppsUserDto?> GetAsync(long id);
    Task<PagedResult<AppsUserDto>> PageAsync(AppsUserQueryDto q);
    Task<long> CreateAsync(AppsUserCreateDto dto);
    Task UpdateAsync(long id, AppsUserUpdateDto dto);
    Task DeleteAsync(long id);
}
