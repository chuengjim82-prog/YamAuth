using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBzss.Bzss;

public partial class CompanyRepository : RepositoryBase<Company>, ICompanyRepository
{
    public CompanyRepository(
        [FromKeyedServices(DbKeys.Bzss)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<Company?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(Company entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(Company entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<Company> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x => (x.NameCn != null && x.NameCn.Contains(kw)) || (x.NameEn != null && x.NameEn.Contains(kw)) || (x.RegistratioNo != null && x.RegistratioNo.Contains(kw)) || (x.LegalName != null && x.LegalName.Contains(kw)) || (x.Currency != null && x.Currency.Contains(kw)) || (x.Remark != null && x.Remark.Contains(kw)) || (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.UpdaterNic != null && x.UpdaterNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }

}
