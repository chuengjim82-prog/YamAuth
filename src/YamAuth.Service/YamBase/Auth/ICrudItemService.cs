using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ICrudItemService : IService
{
    Task<CrudItemDto?> GetAsync(long id);
    Task<PagedResult<CrudItemDto>> PageAsync(CrudItemQueryDto q);
    Task<long> CreateAsync(CrudItemCreateDto dto);
    Task UpdateAsync(long id, CrudItemUpdateDto dto);
    Task DeleteAsync(long id);
}
