using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Bzss;

namespace YamAuth.Service.YamBzss.Bzss;

public partial interface ICompanyService : IService
{
    Task<CompanyDto?> GetAsync(long id);
    Task<PagedResult<CompanyDto>> PageAsync(CompanyQueryDto q);
    Task<long> CreateAsync(CompanyCreateDto dto);
    Task UpdateAsync(long id, CompanyUpdateDto dto);
    Task DeleteAsync(long id);
}
