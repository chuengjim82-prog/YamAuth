namespace YamAuth.DbInit;



public static class InitOptionsParser

{

    public static InitOptions Parse(string[] args)

    {

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < args.Length; i++)

        {

            var arg = args[i];

            if (!arg.StartsWith('-')) continue;

            var key = arg.TrimStart('-');

            if (i + 1 < args.Length && !args[i + 1].StartsWith('-'))

            {

                map[key] = args[++i];

            }

            else

            {

                map[key] = "true";

            }

        }



        var password = map.GetValueOrDefault("password")

            ?? Environment.GetEnvironmentVariable("INIT_DB_PASSWORD")

            ?? "";



        return new InitOptions

        {

            Server = map.GetValueOrDefault("server") ?? "127.0.0.1",

            Port = int.TryParse(map.GetValueOrDefault("port"), out var port) ? port : 1433,

            User = map.GetValueOrDefault("user") ?? "sa",

            Password = password,

            DbBase = map.GetValueOrDefault("db-base") ?? map.GetValueOrDefault("dbBase") ?? "YamBase",

            DbSecondary = map.GetValueOrDefault("db-secondary") ?? map.GetValueOrDefault("dbSecondary") ?? "YamBzss",

            AdminUser = map.GetValueOrDefault("admin-user") ?? "admin",

            AdminPassword = map.GetValueOrDefault("admin-password") ?? "Admin@123",

            ScriptsDir = map.GetValueOrDefault("scripts-dir") ?? "",

            SkipSql = map.ContainsKey("skip-sql"),

            SkipAdminPatch = map.ContainsKey("skip-admin-patch")

        };

    }

}