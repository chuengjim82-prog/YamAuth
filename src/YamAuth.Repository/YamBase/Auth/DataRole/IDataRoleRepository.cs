using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface IDataRoleRepository : IRepository
{
    Task<DataRole?> GetAsync(long id);
    Task<(long total, List<DataRole> items)> PageAsync(int page, int size, string? keyword, bool all = false);
    Task<long> InsertAsync(DataRole entity);
    Task<int> UpdateAsync(DataRole entity);
    Task<int> SoftDeleteAsync(long id);
}
