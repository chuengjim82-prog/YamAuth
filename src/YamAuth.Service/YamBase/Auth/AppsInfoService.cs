using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class AppsInfoService : IAppsInfoService
{
    private readonly IAppsInfoRepository _repo;

    public AppsInfoService(IAppsInfoRepository repo)
    {
        _repo = repo;
    }

    public async Task<AppsInfoDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<AppsInfoDto>();
    }

    public async Task<PagedResult<AppsInfoDto>> PageAsync(AppsInfoQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword, q.All);
        return new PagedResult<AppsInfoDto>
        {
            Total = total,
            Items = items.Adapt<List<AppsInfoDto>>()
        };
    }

    public Task<long> CreateAsync(AppsInfoCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<AppsInfo>());

    public async Task UpdateAsync(long id, AppsInfoUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
