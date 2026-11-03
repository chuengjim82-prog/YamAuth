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
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword, q.All);
        return new PagedResult<CrudMenuDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudMenuDto>>()
        };
    }

    // 层级校验和事务写入见 CrudMenuService.Extensions.cs。
}
