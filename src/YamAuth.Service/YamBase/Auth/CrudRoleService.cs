using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudRoleService : ICrudRoleService
{
    private readonly ICrudRoleRepository _repo;

    public CrudRoleService(ICrudRoleRepository repo)
    {
        _repo = repo;
    }

    public async Task<CrudRoleDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CrudRoleDto>();
    }

    public async Task<PagedResult<CrudRoleDto>> PageAsync(CrudRoleQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword, q.All);
        return new PagedResult<CrudRoleDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudRoleDto>>()
        };
    }

    public Task<long> CreateAsync(CrudRoleCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<CrudRole>());

    public async Task UpdateAsync(long id, CrudRoleUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
