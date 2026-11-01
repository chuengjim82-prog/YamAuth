using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBzss.Bzss;

public partial class ProjectRepository : RepositoryBase<Project>, IProjectRepository
{
    public ProjectRepository(
        [FromKeyedServices(DbKeys.Bzss)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<Project?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(Project entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(Project entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<Project> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x => (x.ProjCode != null && x.ProjCode.Contains(kw)) || (x.ProjName != null && x.ProjName.Contains(kw)) || (x.Remark != null && x.Remark.Contains(kw)) || (x.CreatorNic != null && x.CreatorNic.Contains(kw)) || (x.UpdaterNic != null && x.UpdaterNic.Contains(kw)) || (x.DeleterNic != null && x.DeleterNic.Contains(kw)));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }

}
