using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Bzss;

namespace YamAuth.Service.YamBzss.Bzss;

public partial interface IProjectService : IService
{
    Task<ProjectDto?> GetAsync(long id);
    Task<PagedResult<ProjectDto>> PageAsync(ProjectQueryDto q);
    Task<long> CreateAsync(ProjectCreateDto dto);
    Task UpdateAsync(long id, ProjectUpdateDto dto);
    Task DeleteAsync(long id);
}
