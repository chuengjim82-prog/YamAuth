using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Unit;
using YamAuth.Service.YamBase.Unit;

namespace YamAuth.Api.Controllers.V1.Unit;

[ApiController]
[Route("api/v1/unit/employees")]
public partial class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _svc;
    public EmployeesController(IEmployeeService svc) => _svc = svc;

    [HttpGet, RequirePermission("unit.employees.read")]
    public Task<PagedResult<EmployeeDto>> Page([FromQuery] EmployeeQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("unit.employees.read")]
    public Task<EmployeeDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("unit.employees.create")]
    public Task<long> Create([FromBody] EmployeeCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("unit.employees.update")]
    public Task Update(long id, [FromBody] EmployeeUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("unit.employees.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
