using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.YamBzss.Bzss;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Bzss;
using Mapster;

namespace YamAuth.Service.YamBzss.Bzss;

public partial class ProjectService : IProjectService
{
    private readonly IProjectRepository _repo;

    public ProjectService(IProjectRepository repo)
    {
        _repo = repo;
    }

    public async Task<ProjectDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<ProjectDto>();
    }

    public async Task<PagedResult<ProjectDto>> PageAsync(ProjectQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<ProjectDto>
        {
            Total = total,
            Items = items.Adapt<List<ProjectDto>>()
        };
    }

    public Task<long> CreateAsync(ProjectCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<Project>());

    public async Task UpdateAsync(long id, ProjectUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
