using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudRoleCrudRepository : IRepository
{
    Task<CrudRoleCrud?> GetAsync(long id);
    Task<(long total, List<CrudRoleCrud> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(CrudRoleCrud entity);
    Task<int> UpdateAsync(CrudRoleCrud entity);
    Task<int> SoftDeleteAsync(long id);
}
