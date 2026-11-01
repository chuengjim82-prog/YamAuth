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
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<CrudInfoDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudInfoDto>>()
        };
    }

    public Task<long> CreateAsync(CrudInfoCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<CrudInfo>());

    public async Task UpdateAsync(long id, CrudInfoUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
