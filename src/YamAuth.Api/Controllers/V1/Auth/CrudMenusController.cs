using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/crud-menus")]
[Authorize]
public partial class CrudMenusController : ControllerBase
{
    private readonly ICrudMenuService _svc;
    public CrudMenusController(ICrudMenuService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<CrudMenuDto>> Page([FromQuery] CrudMenuQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<CrudMenuDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] CrudMenuCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] CrudMenuUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
