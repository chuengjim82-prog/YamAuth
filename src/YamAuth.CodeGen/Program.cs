using Microsoft.Extensions.Configuration;
using YamAuth.CodeGen.Generators;
using YamAuth.CodeGen.Schema;

var cfg = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json")
    .Build();

// AppContext.BaseDirectory is .../src/YamAuth.CodeGen/bin/Debug/net8.0/
// Solution root is 5 levels up: net8.0 -> Debug -> bin -> YamAuth.CodeGen -> src -> root
var slnRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
Console.WriteLine($"[Debug] slnRoot = {slnRoot}");

var reader = new SchemaReader();
var entityGen = new EntityGenerator { EntityProjectPath = Path.Combine(slnRoot, cfg["Output:EntityProject"]!) };
var repoGen = new RepositoryGenerator { RepositoryProjectPath = Path.Combine(slnRoot, cfg["Output:RepositoryProject"]!) };
var dtoGen = new DtoGenerator { DtosProjectPath = Path.Combine(slnRoot, cfg["Output:DtosProject"]!) };
var mapGen = new MappingGenerator { ServiceProjectPath = Path.Combine(slnRoot, cfg["Output:ServiceProject"]!) };
var svcGen = new ServiceGenerator { ServiceProjectPath = Path.Combine(slnRoot, cfg["Output:ServiceProject"]!) };
var ctrlGen = new ControllerGenerator { ApiProjectPath = Path.Combine(slnRoot, cfg["Output:ApiProject"]!) };

var validatorGen = new ValidatorGenerator
{
    ApiProjectPath = Path.Combine(slnRoot, cfg["Output:ApiProject"]!),
    DtosProjectPath = Path.Combine(slnRoot, cfg["Output:DtosProject"]!)
};

// 物理库只有 YamAuth。YamBase / YamBzss 是两套 FreeSql 键，表按模块拆开。
var baseConn = cfg.GetSection("Databases").GetChildren().First(d => d["Name"] == "YamBase")["ConnectionString"]!;
var allTables = reader.Read("YamBase", baseConn);
foreach (var t in allTables)
{
    if (t.Module == "Bzss")
        t.DatabaseName = "YamBzss";

    entityGen.Generate(t);
    repoGen.Generate(t);
    dtoGen.Generate(t);
    svcGen.Generate(t);
    ctrlGen.Generate(t);
    Console.WriteLine($"Generated: {t.DatabaseName}/{t.Module}/{t.EntityName}");
}

validatorGen.Generate(allTables);
Console.WriteLine("Generated: Validators/Generated/*.g.cs");

foreach (var grp in allTables.GroupBy(x => x.Module))
{
    mapGen.GenerateForModule(grp.First().DatabaseName, grp.Key, grp);
    Console.WriteLine($"Mapping profile: {grp.Key}Mapping.cs");
}

Console.WriteLine("Done.");
