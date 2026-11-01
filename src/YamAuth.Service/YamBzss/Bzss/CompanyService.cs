using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.YamBzss.Bzss;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Bzss;
using Mapster;

namespace YamAuth.Service.YamBzss.Bzss;

public partial class CompanyService : ICompanyService
{
    private readonly ICompanyRepository _repo;

    public CompanyService(ICompanyRepository repo)
    {
        _repo = repo;
    }

    public async Task<CompanyDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<CompanyDto>();
    }

    public async Task<PagedResult<CompanyDto>> PageAsync(CompanyQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<CompanyDto>
        {
            Total = total,
            Items = items.Adapt<List<CompanyDto>>()
        };
    }

    public Task<long> CreateAsync(CompanyCreateDto dto)
        => _repo.InsertAsync(dto.Adapt<Company>());

    public async Task UpdateAsync(long id, CompanyUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
