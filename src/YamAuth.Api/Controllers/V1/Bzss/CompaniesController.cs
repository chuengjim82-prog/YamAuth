using YamAuth.Api.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Bzss;
using YamAuth.Service.YamBzss.Bzss;

namespace YamAuth.Api.Controllers.V1.Bzss;

[ApiController]
[Route("api/v1/bzss/companies")]
public partial class CompaniesController : ControllerBase
{
    private readonly ICompanyService _svc;
    public CompaniesController(ICompanyService svc) => _svc = svc;

    [HttpGet, RequirePermission("bzss.companies.read")]
    public Task<PagedResult<CompanyDto>> Page([FromQuery] CompanyQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}"), RequirePermission("bzss.companies.read")]
    public Task<CompanyDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost, RequirePermission("bzss.companies.create")]
    public Task<long> Create([FromBody] CompanyCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}"), RequirePermission("bzss.companies.update")]
    public Task Update(long id, [FromBody] CompanyUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}"), RequirePermission("bzss.companies.delete")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
