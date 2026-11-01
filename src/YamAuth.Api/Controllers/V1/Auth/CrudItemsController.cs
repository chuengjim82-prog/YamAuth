using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Api.Filters;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Service.YamBase.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth/crud-items")]
[Authorize]
public partial class CrudItemsController : ControllerBase
{
    private readonly ICrudItemService _svc;
    public CrudItemsController(ICrudItemService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<CrudItemDto>> Page([FromQuery] CrudItemQueryDto q) => _svc.PageAsync(q);

    [HttpGet("{id:long}")]
    public Task<CrudItemDto?> Get(long id) => _svc.GetAsync(id);

    [HttpPost]
    public Task<long> Create([FromBody] CrudItemCreateDto dto) => _svc.CreateAsync(dto);

    [HttpPut("{id:long}")]
    public Task Update(long id, [FromBody] CrudItemUpdateDto dto) => _svc.UpdateAsync(id, dto);

    [HttpDelete("{id:long}")]
    public Task Delete(long id) => _svc.DeleteAsync(id);
}
