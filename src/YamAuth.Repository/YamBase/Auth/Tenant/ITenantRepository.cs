using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ITenantRepository : IRepository
{
    Task<Tenant?> GetAsync(long id);
    Task<(long total, List<Tenant> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(Tenant entity);
    Task<int> UpdateAsync(Tenant entity);
    Task<int> SoftDeleteAsync(long id);
}
