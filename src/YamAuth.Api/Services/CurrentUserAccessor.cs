using System.Security.Claims;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Api.Services;

public class CurrentUserAccessor : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserAccessor(IHttpContextAccessor accessor) => _accessor = accessor;

    public long UserId => long.TryParse(_accessor.HttpContext?.User.FindFirst("sub")?.Value, out var v) ? v : 0;
    public string UserNic => _accessor.HttpContext?.User.FindFirst("nic")?.Value ?? "";
    public IReadOnlyList<string> Permissions =>
        _accessor.HttpContext?.User.FindAll("perm").Select(c => c.Value).ToList()
        ?? new List<string>();
    public bool IsAuthenticated => _accessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
