using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Unit;

namespace YamAuth.Service.YamBase.Unit;

public partial interface IEmployeeService : IService
{
    Task<EmployeeDto?> GetAsync(long id);
    Task<PagedResult<EmployeeDto>> PageAsync(EmployeeQueryDto q);
    Task<long> CreateAsync(EmployeeCreateDto dto);
    Task UpdateAsync(long id, EmployeeUpdateDto dto);
    Task DeleteAsync(long id);
}
