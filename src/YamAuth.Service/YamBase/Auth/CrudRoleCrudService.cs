using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudRoleCrudService : ICrudRoleCrudService
{
    private readonly ICrudRoleCrudRepository _repo;

    public CrudRoleCrudService(ICrudRoleCrudRepository repo)
    {
        _repo = repo;
    }

    public async Task<CrudRoleCrudDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CrudRoleCrudDto>();
    }

    public async Task<PagedResult<CrudRoleCrudDto>> PageAsync(CrudRoleCrudQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<CrudRoleCrudDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudRoleCrudDto>>()
        };
    }

    public Task<long> CreateAsync(CrudRoleCrudCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<CrudRoleCrud>());

    public async Task UpdateAsync(long id, CrudRoleCrudUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
