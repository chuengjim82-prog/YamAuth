namespace YamAuth.Repository.Abstractions;

public interface ICurrentUser
{
    long UserId { get; }
    string UserNic { get; }
    IReadOnlyList<string> Permissions { get; }
    bool IsAuthenticated { get; }
}
