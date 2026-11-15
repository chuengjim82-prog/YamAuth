using YamAuth.Repository.Authorization;
using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class DataRoleUserRepository : RepositoryBase<DataRoleUser>, IDataRoleUserRepository
{
    public DataRoleUserRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser, DataAccessGuard guard, SecurityStore store)
        : base(fsql, currentUser, guard, store) { }

    public Task<DataRoleUser?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(DataRoleUser entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(DataRoleUser entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<DataRoleUser> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Select;
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x => (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        await Guard.DecorateAsync(Fsql, items);
        return (total, items);
    }

}
