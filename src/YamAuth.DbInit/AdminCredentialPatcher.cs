using Microsoft.Data.SqlClient;

namespace YamAuth.DbInit;

public static class AdminCredentialPatcher
{
    public static async Task ApplyAsync(string connectionString, InitOptions options, CancellationToken cancellationToken = default)
    {
        var (hash, salt) = PasswordHasher.Hash(options.AdminPassword);

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE dbo.tb_Auth_User
            SET Password = @password,
                PwdSalt = @salt,
                UserName = @userName,
                UpdateTime = SYSUTCDATETIME()
            WHERE Id = 1 OR UserName IN (@userName, N'admin');
            """;
        cmd.Parameters.AddWithValue("@password", hash);
        cmd.Parameters.AddWithValue("@salt", salt);
        cmd.Parameters.AddWithValue("@userName", options.AdminUser);

        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
        {
            Console.WriteLine("[admin] no admin user found in tb_Auth_User — check init_db.sql seed data");
            return;
        }

        Console.WriteLine($"[admin] credentials applied for user '{options.AdminUser}'");
    }
}
