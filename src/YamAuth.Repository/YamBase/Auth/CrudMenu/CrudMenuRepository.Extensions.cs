using FreeSql;
using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.YamBase.Auth;

public partial class CrudMenuRepository
{
    public Task<List<CrudMenu>> ListAllAsync()
        => Repo.Select.Where(x => !x.IsDeleted).OrderBy(x => x.SortIndex).ToListAsync();
}
