using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using Mapster;

namespace YamAuth.Service.YamBase.Auth;

public partial class UserService : IUserService
{
    private readonly IUserRepository _repo;

    public UserService(IUserRepository repo)
    {
        _repo = repo;
    }

    public async Task<UserDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<UserDto>();
    }

    public async Task<PagedResult<UserDto>> PageAsync(UserQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<UserDto>
        {
            Total = total,
            Items = items.Adapt<List<UserDto>>()
        };
    }

    // CreateAsync / UpdateAsync 含密码哈希，见 UserService.Extensions.cs
    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
