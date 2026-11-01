using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ICrudRoleCrudService : IService
{
    Task<CrudRoleCrudDto?> GetAsync(long id);
    Task<PagedResult<CrudRoleCrudDto>> PageAsync(CrudRoleCrudQueryDto q);
    Task<long> CreateAsync(CrudRoleCrudCreateDto dto);
    Task UpdateAsync(long id, CrudRoleCrudUpdateDto dto);
    Task DeleteAsync(long id);
}
