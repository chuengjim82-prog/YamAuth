using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudRoleUserRepository : IRepository
{
    Task<CrudRoleUser?> GetAsync(long id);
    Task<(long total, List<CrudRoleUser> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(CrudRoleUser entity);
    Task<int> UpdateAsync(CrudRoleUser entity);
    Task<int> SoftDeleteAsync(long id);
}
