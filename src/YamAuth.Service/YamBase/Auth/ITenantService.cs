using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ITenantService : IService
{
    Task<TenantDto?> GetAsync(long id);
    Task<PagedResult<TenantDto>> PageAsync(TenantQueryDto q);
    Task<long> CreateAsync(TenantCreateDto dto);
    Task UpdateAsync(long id, TenantUpdateDto dto);
    Task DeleteAsync(long id);
}
