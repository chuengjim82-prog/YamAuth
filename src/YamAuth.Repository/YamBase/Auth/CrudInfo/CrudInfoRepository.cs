using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class CrudInfoRepository : RepositoryBase<CrudInfo>, ICrudInfoRepository
{
    public CrudInfoRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<CrudInfo?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(CrudInfo entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(CrudInfo entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<CrudInfo> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x => (x.CrudName != null && x.CrudName.Contains(kw)) || (x.CrudCode != null && x.CrudCode.Contains(kw)) || (x.Remark != null && x.Remark.Contains(kw)) || (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.UpdaterNic != null && x.UpdaterNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }

}
