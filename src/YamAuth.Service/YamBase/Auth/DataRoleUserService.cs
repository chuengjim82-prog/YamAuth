using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class DataRoleUserService : IDataRoleUserService
{
    private readonly IDataRoleUserRepository _repo;

    public DataRoleUserService(IDataRoleUserRepository repo)
    {
        _repo = repo;
    }

    public async Task<DataRoleUserDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<DataRoleUserDto>();
    }

    public async Task<PagedResult<DataRoleUserDto>> PageAsync(DataRoleUserQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<DataRoleUserDto>
        {
            Total = total,
            Items = items.Adapt<List<DataRoleUserDto>>()
        };
    }

    public Task<long> CreateAsync(DataRoleUserCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<DataRoleUser>());

    public async Task UpdateAsync(long id, DataRoleUserUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
