using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ICrudInfoService : IService
{
    Task<CrudInfoDto?> GetAsync(long id);
    Task<PagedResult<CrudInfoDto>> PageAsync(CrudInfoQueryDto q);
    Task<long> CreateAsync(CrudInfoCreateDto dto);
    Task UpdateAsync(long id, CrudInfoUpdateDto dto);
    Task DeleteAsync(long id);
}
