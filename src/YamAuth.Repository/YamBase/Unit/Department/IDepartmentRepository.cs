using YamAuth.Entity.YamBase.Unit;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Unit;

public partial interface IDepartmentRepository : IRepository
{
    Task<Department?> GetAsync(long id);
    Task<(long total, List<Department> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(Department entity);
    Task<int> UpdateAsync(Department entity);
    Task<int> SoftDeleteAsync(long id);
}
