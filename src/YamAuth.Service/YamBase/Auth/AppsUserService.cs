using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class AppsUserService : IAppsUserService
{
    private readonly IAppsUserRepository _repo;

    public AppsUserService(IAppsUserRepository repo)
    {
        _repo = repo;
    }

    public async Task<AppsUserDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<AppsUserDto>();
    }

    public async Task<PagedResult<AppsUserDto>> PageAsync(AppsUserQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<AppsUserDto>
        {
            Total = total,
            Items = items.Adapt<List<AppsUserDto>>()
        };
    }

    public Task<long> CreateAsync(AppsUserCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<AppsUser>());

    public async Task UpdateAsync(long id, AppsUserUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
