using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface IAppsUserRepository : IRepository
{
    Task<AppsUser?> GetAsync(long id);
    Task<(long total, List<AppsUser> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(AppsUser entity);
    Task<int> UpdateAsync(AppsUser entity);
    Task<int> SoftDeleteAsync(long id);
}
