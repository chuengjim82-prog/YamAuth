using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface IUserRepository
{
    Task<User?> FindByUserNameAsync(string userName);
    Task<User?> FindByEmailAsync(string email);
    Task<bool> ExistsEmailAsync(string email, long? excludeUserId = null);
}
