using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class DataRoleService : IDataRoleService
{
    private readonly IDataRoleRepository _repo;

    public DataRoleService(IDataRoleRepository repo)
    {
        _repo = repo;
    }

    public async Task<DataRoleDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<DataRoleDto>();
    }

    public async Task<PagedResult<DataRoleDto>> PageAsync(DataRoleQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<DataRoleDto>
        {
            Total = total,
            Items = items.Adapt<List<DataRoleDto>>()
        };
    }

    public Task<long> CreateAsync(DataRoleCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<DataRole>());

    public async Task UpdateAsync(long id, DataRoleUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
