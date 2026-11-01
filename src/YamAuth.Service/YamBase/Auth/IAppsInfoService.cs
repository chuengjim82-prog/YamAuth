using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface IAppsInfoService : IService
{
    Task<AppsInfoDto?> GetAsync(long id);
    Task<PagedResult<AppsInfoDto>> PageAsync(AppsInfoQueryDto q);
    Task<long> CreateAsync(AppsInfoCreateDto dto);
    Task UpdateAsync(long id, AppsInfoUpdateDto dto);
    Task DeleteAsync(long id);
}
