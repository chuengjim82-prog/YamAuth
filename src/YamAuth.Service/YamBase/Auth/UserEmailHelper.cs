namespace YamAuth.Service.YamBase.Auth;

public static class UserEmailHelper
{
    public static string Normalize(string email) => email.Trim().ToLowerInvariant();
}
