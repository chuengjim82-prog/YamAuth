using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudMenuRepository
{
    Task<T> WithHierarchyAsync<T>(Func<HierarchySession<CrudMenu>, Task<T>> action);
}
