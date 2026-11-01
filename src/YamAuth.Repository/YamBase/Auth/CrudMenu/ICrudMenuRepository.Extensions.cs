using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface ICrudMenuRepository
{
    Task<List<CrudMenu>> ListAllAsync();
}
