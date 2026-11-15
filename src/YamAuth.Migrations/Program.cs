using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Data.SqlClient;
using YamAuth.Migrations;

// 不读取应用配置或默认连接：每次执行必须显式选择目标和清单。
var json = new JsonSerializerOptions { PropertyNameCaseInsensitive = true, WriteIndented = true,
    Converters = { new JsonStringEnumConverter() } };
try
{
    if (args.Length == 0 || args[0] is not ("inspect" or "apply" or "verify" or "test-init"))
        throw new InvalidOperationException("用法：inspect | verify | apply <mapping.json> | test-init；连接通过 YAMAUTH_MIGRATION_CONNECTION 指定");
    var connection = Environment.GetEnvironmentVariable("YAMAUTH_MIGRATION_CONNECTION");
    if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("必须设置 YAMAUTH_MIGRATION_CONNECTION");
    await using var runner = new MigrationRunner(connection);
    if (args[0] == "test-init") await runner.InitializeTestDatabaseAsync();
    else if (args[0] == "apply")
    {
        if (args.Length != 2) throw new InvalidOperationException("apply 必须指定经过核对的映射文件");
        var bytes = await File.ReadAllBytesAsync(args[1]);
        var manifest = JsonSerializer.Deserialize<MigrationManifest>(bytes, json) ?? throw new InvalidOperationException("映射清单无效");
        await runner.ApplyAsync(manifest, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)));
    }
    var report = await runner.InspectAsync();
    Console.WriteLine(JsonSerializer.Serialize(report, json));
    if (args[0] == "verify") await runner.VerifyAsync();
}
catch (Exception exception)
{
    // SQL 异常消息可能包含账号等数据；默认只输出编号，详细诊断由团队在隔离环境查看。
    Console.Error.WriteLine(exception is SqlException sql ? $"数据库操作失败，SQL 错误编号：{sql.Number}" : exception.Message);
    Environment.ExitCode = 1;
}
