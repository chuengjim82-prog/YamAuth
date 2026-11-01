namespace YamAuth.Service.Abstractions;

/// <summary>BCrypt 密码哈希，与登录校验（password + PwdSalt）保持一致。</summary>
public static class PasswordHelper
{
    public static (string Hash, string Salt) Hash(string password)
    {
        var salt = Guid.NewGuid().ToString("N");
        var hash = BCrypt.Net.BCrypt.HashPassword(password + salt);
        return (hash, salt);
    }

    public static bool Verify(string password, string salt, string hash)
        => BCrypt.Net.BCrypt.Verify(password + salt, hash);
}
