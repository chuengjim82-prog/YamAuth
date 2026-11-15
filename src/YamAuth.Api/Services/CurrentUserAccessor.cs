using YamAuth.Authorization;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Api.Services;

public class CurrentUserAccessor(AccessContext access) : ICurrentUser
{
    public long UserId => access.Snapshot?.UserId ?? 0;
    public string UserNic => access.Snapshot?.NickName ?? "";
    public IReadOnlyList<string> Permissions => access.Snapshot == null ? Array.Empty<string>()
        : ResourceSecurityCatalog.Permissions.Where(x => access.Snapshot.Can(x.Code)).Select(x => x.Code).ToArray();
    public bool IsAuthenticated => access.Snapshot != null;
}
