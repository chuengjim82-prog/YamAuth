using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudRoleRepository : IRepository
{
    Task<CrudRole?> GetAsync(long id);
    Task<(long total, List<CrudRole> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(CrudRole entity);
    Task<int> UpdateAsync(CrudRole entity);
    Task<int> SoftDeleteAsync(long id);
}
