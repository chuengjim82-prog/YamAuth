using FreeSql;
using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.YamBase.Auth;

public partial class CrudMenuRepository
{
    public Task<List<CrudMenu>> ListAllAsync()
        => Select.OrderBy(x => x.SortIndex).ToListAsync();
}
