using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ICrudMenuService : IService
{
    Task<CrudMenuDto?> GetAsync(long id);
    Task<PagedResult<CrudMenuDto>> PageAsync(CrudMenuQueryDto q);
    Task<long> CreateAsync(CrudMenuCreateDto dto);
    Task UpdateAsync(long id, CrudMenuUpdateDto dto);
    Task DeleteAsync(long id);
}
