using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBzss.Bzss;

public partial interface ICompanyRepository : IRepository
{
    Task<Company?> GetAsync(long id);
    Task<(long total, List<Company> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(Company entity);
    Task<int> UpdateAsync(Company entity);
    Task<int> SoftDeleteAsync(long id);
}
