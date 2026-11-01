using FreeSql;
using YamAuth.Entity.YamBase.Auth;

namespace YamAuth.Repository.YamBase.Auth;

public partial class UserRepository
{
    public Task<User?> FindByUserNameAsync(string userName)
        => Repo.Select.Where(u => u.UserName == userName && !u.IsDeleted).FirstAsync()!;

    public Task<User?> FindByEmailAsync(string email)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return Repo.Select
            .Where(u => !u.IsDeleted && u.Email.ToLower() == normalized)
            .FirstAsync()!;
    }

    public Task<bool> ExistsEmailAsync(string email, long? excludeUserId = null)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var select = Repo.Select.Where(u => !u.IsDeleted && u.Email.ToLower() == normalized);
        if (excludeUserId is > 0)
            select = select.Where(u => u.Id != excludeUserId.Value);
        return select.AnyAsync();
    }

}

