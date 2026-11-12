using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class DataRoleRepository : RepositoryBase<DataRole>, IDataRoleRepository
{
    public DataRoleRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<DataRole?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(DataRole entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(DataRole entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<DataRole> items)> PageAsync(int page, int size, string? keyword, bool all = false)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x => (x.RoleCode != null && x.RoleCode.Contains(kw)) || (x.RoleName != null && x.RoleName.Contains(kw)) || (x.Remark != null && x.Remark.Contains(kw)) || (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.UpdaterNic != null && x.UpdaterNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        if (all)
        {
            var allItems = await select.OrderBy(x => x.SortIndex ?? 0).OrderBy(x => x.Id).ToListAsync();
            return (allItems.Count, allItems);
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).OrderByDescending(x => x.Id).ToListAsync();
        return (total, items);
    }

}
