using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface IDataRoleUserService : IService
{
    Task<DataRoleUserDto?> GetAsync(long id);
    Task<PagedResult<DataRoleUserDto>> PageAsync(DataRoleUserQueryDto q);
    Task<long> CreateAsync(DataRoleUserCreateDto dto);
    Task UpdateAsync(long id, DataRoleUserUpdateDto dto);
    Task DeleteAsync(long id);
}
