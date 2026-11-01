using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class AppsUserRepository : RepositoryBase<AppsUser>, IAppsUserRepository
{
    public AppsUserRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<AppsUser?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(AppsUser entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(AppsUser entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<AppsUser> items)> PageAsync(int page, int size, string? keyword)
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
