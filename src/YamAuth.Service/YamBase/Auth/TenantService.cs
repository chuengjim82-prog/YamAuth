using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class TenantService : ITenantService
{
    private readonly ITenantRepository _repo;

    public TenantService(ITenantRepository repo)
    {
        _repo = repo;
    }

    public async Task<TenantDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<TenantDto>();
    }

    public async Task<PagedResult<TenantDto>> PageAsync(TenantQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<TenantDto>
        {
            Total = total,
            Items = items.Adapt<List<TenantDto>>()
        };
    }

    public Task<long> CreateAsync(TenantCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<Tenant>());

    public async Task UpdateAsync(long id, TenantUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
