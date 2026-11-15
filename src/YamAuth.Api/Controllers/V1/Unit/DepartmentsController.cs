using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Unit;
using YamAuth.Service.YamBase.Unit;

namespace YamAuth.Api.Controllers.V1.Unit;

[ApiController]
[Route("api/v1/unit/departments")]
public partial class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _svc;
    public DepartmentsController(IDepartmentService svc) => _svc = svc;

    [HttpGet, RequirePermission("unit.departments.read")]
    public Task<PagedResult<DepartmentDto>> Page([FromQuery] DepartmentQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("unit.departments.read")]
    public Task<DepartmentDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("unit.departments.create")]
    public Task<long> Create([FromBody] DepartmentCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("unit.departments.update")]
    public Task Update(long id, [FromBody] DepartmentUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("unit.departments.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
