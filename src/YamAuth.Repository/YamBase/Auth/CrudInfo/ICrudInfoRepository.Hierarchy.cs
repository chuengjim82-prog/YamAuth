using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudInfoRepository
{
    Task<T> WithHierarchyAsync<T>(Func<HierarchySession<CrudInfo>, Task<T>> action);
}
