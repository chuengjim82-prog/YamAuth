using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Service.Authorization;

namespace YamAuth.Api.Controllers.V1.Unit;

[ApiController]
[Route("api/v1")]
public sealed class OwnershipController(OwnershipService service) : ControllerBase
{
    [HttpPut("unit/employees/{id:long}/assignment"), RequirePermission("unit.employees.assignment")]
    public Task Assignment(long id, EmployeeAssignmentDto dto) => service.AssignEmployeeAsync(id, dto);
    [HttpPut("bzss/companies/{id:long}/ownership"), RequirePermission("bzss.companies.transfer")]
    public Task Company(long id, OwnershipTransferDto dto) => service.TransferCompanyAsync(id, dto);
    [HttpPut("bzss/projects/{id:long}/ownership"), RequirePermission("bzss.projects.transfer")]
    public Task Project(long id, OwnershipTransferDto dto) => service.TransferProjectAsync(id, dto);
}
