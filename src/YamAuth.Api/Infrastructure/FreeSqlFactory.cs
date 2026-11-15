using FreeSql;
using Serilog;

namespace YamAuth.Api.Infrastructure;

public static class FreeSqlFactory
{
    public static IFreeSql Create(IConfiguration configuration, string connectionKey, string logLabel)
    {
        var fsql = new FreeSqlBuilder()
            .UseConnectionString(DataType.SqlServer, configuration[$"Db:{connectionKey}"]!)
            .UseAutoSyncStructure(false)
            .Build();

        if (configuration.GetValue<bool>("Db:LogSql"))
        {
            fsql.Aop.CurdAfter += (_, e) =>
                Log.Debug("[{Db}] 数据库操作完成 ({Elapsed}ms)", logLabel, e.ElapsedMilliseconds);
        }

        return fsql;
    }
}
