using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace YamAuth.DbInit;

public static partial class SqlScriptRunner
{
    public static async Task ExecuteFileAsync(string connectionString, string filePath, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException($"SQL script not found: {filePath}");

        var script = await File.ReadAllTextAsync(filePath, cancellationToken);
        await ExecuteScriptAsync(connectionString, script, cancellationToken);
    }

    public static async Task ExecuteScriptAsync(string connectionString, string script, CancellationToken cancellationToken = default)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        var batchIndex = 0;
        foreach (var batch in SplitBatches(script))
        {
            batchIndex++;
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = batch;
            cmd.CommandTimeout = 0;
            try
            {
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (SqlException ex)
            {
                throw new InvalidOperationException(
                    $"SQL batch #{batchIndex} failed: {ex.Message}{Environment.NewLine}{Truncate(batch)}", ex);
            }
        }
    }

    static IEnumerable<string> SplitBatches(string script)
    {
        foreach (var part in GoBatchRegex().Split(script))
        {
            var batch = part.Trim();
            if (batch.Length > 0)
                yield return batch;
        }
    }

    static string Truncate(string text, int maxLength = 400) =>
        text.Length <= maxLength ? text : text[..maxLength] + "...";

    [GeneratedRegex(@"^\s*GO\s*(?:\d+)?\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex GoBatchRegex();
}
