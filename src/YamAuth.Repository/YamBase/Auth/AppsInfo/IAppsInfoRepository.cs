using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface IAppsInfoRepository : IRepository
{
    Task<AppsInfo?> GetAsync(long id);
    Task<(long total, List<AppsInfo> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(AppsInfo entity);
    Task<int> UpdateAsync(AppsInfo entity);
    Task<int> SoftDeleteAsync(long id);
}
