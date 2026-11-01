using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBzss.Bzss;

public partial interface IProjectRepository : IRepository
{
    Task<Project?> GetAsync(long id);
    Task<(long total, List<Project> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(Project entity);
    Task<int> UpdateAsync(Project entity);
    Task<int> SoftDeleteAsync(long id);
}
