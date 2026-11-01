using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Unit;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Unit;

public partial class EmployeeRepository : RepositoryBase<Employee>, IEmployeeRepository
{
    public EmployeeRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<Employee?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(Employee entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(Employee entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<Employee> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x => (x.Remark != null && x.Remark.Contains(kw)) || (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.UpdaterNic != null && x.UpdaterNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }

}
