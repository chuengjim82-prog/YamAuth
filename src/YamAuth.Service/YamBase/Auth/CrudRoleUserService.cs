using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudRoleUserService : ICrudRoleUserService
{
    private readonly ICrudRoleUserRepository _repo;

    public CrudRoleUserService(ICrudRoleUserRepository repo)
    {
        _repo = repo;
    }

    public async Task<CrudRoleUserDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CrudRoleUserDto>();
    }

    public async Task<PagedResult<CrudRoleUserDto>> PageAsync(CrudRoleUserQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<CrudRoleUserDto>
        {
            Total = total,
            Items = items.Adapt<List<CrudRoleUserDto>>()
        };
    }

    public Task<long> CreateAsync(CrudRoleUserCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<CrudRoleUser>());

    public async Task UpdateAsync(long id, CrudRoleUserUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
