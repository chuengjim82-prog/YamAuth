using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudItemRepository : IRepository
{
    Task<CrudItem?> GetAsync(long id);
    Task<(long total, List<CrudItem> items)> PageAsync(int page, int size, string? keyword, bool all = false);
    Task<long> InsertAsync(CrudItem entity);
    Task<int> UpdateAsync(CrudItem entity);
    Task<int> SoftDeleteAsync(long id);
}
