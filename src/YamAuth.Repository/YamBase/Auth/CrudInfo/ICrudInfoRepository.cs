using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudInfoRepository : IRepository
{
    Task<CrudInfo?> GetAsync(long id);
    Task<(long total, List<CrudInfo> items)> PageAsync(int page, int size, string? keyword, bool all = false);
    Task<long> InsertAsync(CrudInfo entity);
    Task<int> UpdateAsync(CrudInfo entity);
    Task<int> SoftDeleteAsync(long id);
}
