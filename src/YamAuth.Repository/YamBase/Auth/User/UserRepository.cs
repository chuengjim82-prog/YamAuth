using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class UserRepository : RepositoryBase<User>, IUserRepository
{
    public UserRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<User?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(User entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(User entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<User> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            // 编号按十进制文本包含匹配，与用户选择器的名称搜索使用同一分页查询。
            select = select.Where(x => Convert.ToString(x.Id).Contains(kw) || (x.UserName != null && x.UserName.Contains(kw)) || (x.NickName != null && x.NickName.Contains(kw)) || (x.Avatar != null && x.Avatar.Contains(kw)) || (x.Phone != null && x.Phone.Contains(kw)) || (x.Email != null && x.Email.Contains(kw)) || (x.Remark != null && x.Remark.Contains(kw)) || (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.UpdaterNic != null && x.UpdaterNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }

}
