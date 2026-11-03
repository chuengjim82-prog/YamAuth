using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial class CrudInfoRepository
{
    public Task<T> WithHierarchyAsync<T>(Func<HierarchySession<CrudInfo>, Task<T>> action)
        => HierarchySession<CrudInfo>.RunAsync(Fsql, Current, action);
}
