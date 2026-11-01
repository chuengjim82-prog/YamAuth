using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Bzss;
using YamAuth.Service.YamBzss.Bzss;

namespace YamAuth.Api.Controllers.V1.Bzss;

[ApiController]
[Route("api/v1/bzss/projects")]
[Authorize]
public partial class ProjectsController : ControllerBase
{
    private readonly IProjectService _svc;
    public ProjectsController(IProjectService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<ProjectDto>> Page([FromQuery] ProjectQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<ProjectDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] ProjectCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] ProjectUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
