using YamAuth.Entity.YamBase.Unit;
using YamAuth.Repository.YamBase.Unit;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Unit;
using Mapster;

namespace YamAuth.Service.YamBase.Unit;

public partial class DepartmentService : IDepartmentService
{
    private readonly IDepartmentRepository _repo;

    public DepartmentService(IDepartmentRepository repo)
    {
        _repo = repo;
    }

    public async Task<DepartmentDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<DepartmentDto>();
    }

    public async Task<PagedResult<DepartmentDto>> PageAsync(DepartmentQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<DepartmentDto>
        {
            Total = total,
            Items = items.Adapt<List<DepartmentDto>>()
        };
    }

    public Task<long> CreateAsync(DepartmentCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<Department>());

    public async Task UpdateAsync(long id, DepartmentUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
