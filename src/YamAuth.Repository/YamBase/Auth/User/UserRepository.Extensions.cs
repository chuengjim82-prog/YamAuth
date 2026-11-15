using FreeSql;
using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.YamBase.Auth;

public partial class UserRepository
{
    public Task<User?> FindByUserNameAsync(string userName)
        => Store.Select<User>().Where(u => u.UserName == userName && !u.IsDeleted).FirstAsync()!;

    public Task<User?> FindByEmailAsync(string email)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return Store.Select<User>()
            .Where(u => !u.IsDeleted && u.Email.ToLower() == normalized)
            .FirstAsync()!;
    }

    public Task<bool> ExistsEmailAsync(string email, long? excludeUserId = null)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var select = Store.Select<User>().Where(u => !u.IsDeleted && u.Email.ToLower() == normalized);
        if (excludeUserId is > 0)
            select = select.Where(u => u.Id != excludeUserId.Value);
        return select.AnyAsync();
    }

}

