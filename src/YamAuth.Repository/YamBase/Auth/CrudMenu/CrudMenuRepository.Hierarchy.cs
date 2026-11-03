using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class CrudMenuRepository
{
    public Task<T> WithHierarchyAsync<T>(Func<HierarchySession<CrudMenu>, Task<T>> action)
        => HierarchySession<CrudMenu>.RunAsync(Fsql, Current, action);
}
