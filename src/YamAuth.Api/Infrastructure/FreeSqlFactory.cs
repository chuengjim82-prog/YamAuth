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
                Log.Debug("[{Db}] ({Elapsed}ms) {Sql}", logLabel, e.ElapsedMilliseconds, e.Sql);
        }

        return fsql;
    }
}
