using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Auth;

public partial interface IUserRepository : IRepository
{
    Task<User?> GetAsync(long id);
    Task<(long total, List<User> items)> PageAsync(int page, int size, string? keyword);
    Task<long> InsertAsync(User entity);
    Task<int> UpdateAsync(User entity);
    Task<int> SoftDeleteAsync(long id);
}
