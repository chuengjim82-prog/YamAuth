using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Unit;

namespace YamAuth.Service.YamBase.Unit;

public partial interface IDepartmentService : IService
{
    Task<DepartmentDto?> GetAsync(long id);
    Task<PagedResult<DepartmentDto>> PageAsync(DepartmentQueryDto q);
    Task<long> CreateAsync(DepartmentCreateDto dto);
    Task UpdateAsync(long id, DepartmentUpdateDto dto);
    Task DeleteAsync(long id);
}
