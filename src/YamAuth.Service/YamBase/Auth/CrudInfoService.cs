using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudInfoService : ICrudInfoService
{
    private readonly ICrudInfoRepository _repo;

    public CrudInfoService(ICrudInfoRepository repo)
    {
        _repo = repo;
    }

    public async Task<CrudInfoDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CrudInfoDto>();
    }

    public async Task<PagedResult<CrudInfoDto>> PageAsync(CrudInfoQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword, q.All);
        return new PagedResult<CrudInfoDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudInfoDto>>()
        };
    }

    // 层级校验和事务写入见 CrudInfoService.Extensions.cs。
}
