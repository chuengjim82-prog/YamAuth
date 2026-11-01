using YamAuth.Entity.YamBase.Unit;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Unit;

public partial interface IEmployeeRepository : IRepository
{
    Task<Employee?> GetAsync(long id);
    Task<(long total, List<Employee> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(Employee entity);
    Task<int> UpdateAsync(Employee entity);
    Task<int> SoftDeleteAsync(long id);
}
