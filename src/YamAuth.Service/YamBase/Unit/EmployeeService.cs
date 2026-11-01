using YamAuth.Entity.YamBase.Unit;
using YamAuth.Repository.YamBase.Unit;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Unit;
using Mapster;

namespace YamAuth.Service.YamBase.Unit;

public partial class EmployeeService : IEmployeeService
{
    private readonly IEmployeeRepository _repo;

    public EmployeeService(IEmployeeRepository repo)
    {
        _repo = repo;
    }

    public async Task<EmployeeDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<EmployeeDto>();
    }

    public async Task<PagedResult<EmployeeDto>> PageAsync(EmployeeQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<EmployeeDto>
        {
            Total = total,
            Items = items.Adapt<List<EmployeeDto>>()
        };
    }

    public Task<long> CreateAsync(EmployeeCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<Employee>());

    public async Task UpdateAsync(long id, EmployeeUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
