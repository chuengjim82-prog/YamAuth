using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudMenuService : ICrudMenuService
{
    private readonly ICrudMenuRepository _repo;

    public CrudMenuService(ICrudMenuRepository repo)
    {
        _repo = repo;
    }

    public async Task<CrudMenuDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CrudMenuDto>();
    }

    public async Task<PagedResult<CrudMenuDto>> PageAsync(CrudMenuQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<CrudMenuDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudMenuDto>>()
        };
    }

    public Task<long> CreateAsync(CrudMenuCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<CrudMenu>());

    public async Task UpdateAsync(long id, CrudMenuUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
