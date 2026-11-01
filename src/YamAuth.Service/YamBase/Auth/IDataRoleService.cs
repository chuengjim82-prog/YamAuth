using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial interface IDataRoleService : IService
{
    Task<DataRoleDto?> GetAsync(long id);
    Task<PagedResult<DataRoleDto>> PageAsync(DataRoleQueryDto q);
    Task<long> CreateAsync(DataRoleCreateDto dto);
    Task UpdateAsync(long id, DataRoleUpdateDto dto);
    Task DeleteAsync(long id);
}
