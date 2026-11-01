using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudItemService : ICrudItemService
{
    private readonly ICrudItemRepository _repo;

    public CrudItemService(ICrudItemRepository repo)
    {
        _repo = repo;
    }

    public async Task<CrudItemDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CrudItemDto>();
    }

    public async Task<PagedResult<CrudItemDto>> PageAsync(CrudItemQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<CrudItemDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudItemDto>>()
        };
    }

    public Task<long> CreateAsync(CrudItemCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<CrudItem>());

    public async Task UpdateAsync(long id, CrudItemUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
