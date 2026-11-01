using Microsoft.Data.SqlClient;

namespace YamAuth.DbInit;

public static class DatabaseCreator
{
    public static async Task EnsureDatabasesAsync(string masterConnectionString, params string[] databaseNames)
    {
        try
        {
            await using var conn = new SqlConnection(masterConnectionString);
            await conn.OpenAsync();
            foreach (var name in databaseNames)
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = """
                    IF DB_ID(@name) IS NULL
                    BEGIN
                        DECLARE @sql NVARCHAR(MAX) = N'CREATE DATABASE [' + REPLACE(@name, N']', N']]') + N']';
                        EXEC (@sql);
                    END
                    """;
                cmd.Parameters.AddWithValue("@name", name);
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"[db] ensured database: {name}");
            }
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException(
                "Cannot connect to SQL Server via master, or CREATE DATABASE failed. " +
                "Target catalog names do not need to exist beforehand. " +
                "Check --server/--port/--user/--password and that the login can create databases. " +
                $"SqlError: {ex.Message}", ex);
        }
    }

    public static string BuildConnectionString(string server, int port, string database, string user, string password) =>
        $"Server={server},{port};Database={database};User Id={user};Password={password};TrustServerCertificate=True;";

    public static string BuildMasterConnectionString(string server, int port, string user, string password) =>
        BuildConnectionString(server, port, "master", user, password);
}
