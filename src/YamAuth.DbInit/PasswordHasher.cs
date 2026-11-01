namespace YamAuth.DbInit;

internal static class PasswordHasher
{
    public static (string Hash, string Salt) Hash(string password)
    {
        var salt = Guid.NewGuid().ToString("N");
        var hash = BCrypt.Net.BCrypt.HashPassword(password + salt);
        return (hash, salt);
    }
}
