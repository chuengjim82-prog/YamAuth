using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface ICrudRoleUserService : IService
{
    Task<CrudRoleUserDto?> GetAsync(long id);
    Task<PagedResult<CrudRoleUserDto>> PageAsync(CrudRoleUserQueryDto q);
    Task<long> CreateAsync(CrudRoleUserCreateDto dto);
    Task UpdateAsync(long id, CrudRoleUserUpdateDto dto);
    Task DeleteAsync(long id);
}
