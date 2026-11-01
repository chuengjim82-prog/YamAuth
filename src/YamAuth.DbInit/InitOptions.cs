namespace YamAuth.DbInit;



public sealed class InitOptions

{

    public string Server { get; init; } = "127.0.0.1";

    public int Port { get; init; } = 1433;

    public string User { get; init; } = "sa";

    public string Password { get; init; } = "";

    public string DbBase { get; init; } = "YamBase";

    public string DbSecondary { get; init; } = "YamBzss";

    public string AdminUser { get; init; } = "admin";

    public string AdminPassword { get; init; } = "Admin@123";

    public string ScriptsDir { get; init; } = "";

    public bool SkipSql { get; init; }

    public bool SkipAdminPatch { get; init; }

}

