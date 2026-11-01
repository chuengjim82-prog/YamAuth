using YamAuth.DbInit;

var options = InitOptionsParser.Parse(args);
if (string.IsNullOrWhiteSpace(options.Password))
{
    Console.Error.WriteLine("Password is required. Use --password or INIT_DB_PASSWORD environment variable.");
    return 1;
}

var scriptsDir = options.ScriptsDir;
if (string.IsNullOrWhiteSpace(scriptsDir))
{
    Console.Error.WriteLine("Scripts directory is required. Use --scripts-dir (e.g. path to repository scripts folder).");
    return 1;
}

var manifestPath = Path.Combine(scriptsDir, "init-db.manifest.json");
var masterConn = DatabaseCreator.BuildMasterConnectionString(options.Server, options.Port, options.User, options.Password);
var baseConn = DatabaseCreator.BuildConnectionString(options.Server, options.Port, options.DbBase, options.User, options.Password);
var secondaryConn = DatabaseCreator.BuildConnectionString(options.Server, options.Port, options.DbSecondary, options.User, options.Password);

Console.WriteLine($"[init] server={options.Server}:{options.Port}");
Console.WriteLine($"[init] databases={options.DbBase}, {options.DbSecondary}");
Console.WriteLine($"[init] scripts={scriptsDir}");

await DatabaseCreator.EnsureDatabasesAsync(masterConn, options.DbBase, options.DbSecondary);

if (!options.SkipSql)
{
    var manifest = InitManifest.Load(manifestPath);

    foreach (var script in manifest.BaseScripts)
    {
        var file = Path.Combine(scriptsDir, script);
        Console.WriteLine($"[sql] {script} -> {options.DbBase}");
        await SqlScriptRunner.ExecuteFileAsync(baseConn, file);
    }

    foreach (var script in manifest.SecondaryScripts)
    {
        var file = Path.Combine(scriptsDir, script);
        if (!File.Exists(file))
        {
            Console.WriteLine($"[sql] skip missing secondary script: {script}");
            continue;
        }

        Console.WriteLine($"[sql] {script} -> {options.DbSecondary}");
        await SqlScriptRunner.ExecuteFileAsync(secondaryConn, file);
    }

    if (!options.SkipAdminPatch)
        await AdminCredentialPatcher.ApplyAsync(baseConn, options);
}
else
{
    Console.WriteLine("[sql] skipped (--skip-sql)");
}

Console.WriteLine("[init] database bootstrap completed");
return 0;
