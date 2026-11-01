using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudMenuRepository : IRepository
{
    Task<CrudMenu?> GetAsync(long id);
    Task<(long total, List<CrudMenu> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(CrudMenu entity);
    Task<int> UpdateAsync(CrudMenu entity);
    Task<int> SoftDeleteAsync(long id);
}
