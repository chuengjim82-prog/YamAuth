using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface IDataRoleUserRepository : IRepository
{
    Task<DataRoleUser?> GetAsync(long id);
    Task<(long total, List<DataRoleUser> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(DataRoleUser entity);
    Task<int> UpdateAsync(DataRoleUser entity);
    Task<int> SoftDeleteAsync(long id);
}
