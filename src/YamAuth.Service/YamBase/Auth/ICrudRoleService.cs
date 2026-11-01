using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ICrudRoleService : IService
{
    Task<CrudRoleDto?> GetAsync(long id);
    Task<PagedResult<CrudRoleDto>> PageAsync(CrudRoleQueryDto q);
    Task<long> CreateAsync(CrudRoleCreateDto dto);
    Task UpdateAsync(long id, CrudRoleUpdateDto dto);
    Task DeleteAsync(long id);
}
