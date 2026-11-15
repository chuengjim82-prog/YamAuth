using System.Diagnostics;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using System.Xml.Linq;
using FreeSql.DataAnnotations;
using YamAuth.Authorization;
using YamAuth.CodeGen.Generators;
using YamAuth.CodeGen.Schema;
using YamAuth.Entity.YamBase.Auth;
using Xunit;

namespace YamAuth.Tests;

public sealed class CodegenCompilationTests
{
    [Fact]
    public async Task AllGeneratedBackendLayersCompileWithHandwrittenSecurityExtensions()
    {
        var repository = new DirectoryInfo(AppContext.BaseDirectory);
        while (repository != null && !File.Exists(Path.Combine(repository.FullName, "src", "YamAuth.sln"))) repository = repository.Parent;
        Assert.NotNull(repository);
        var root = Path.Combine(OperatingSystem.IsMacOS() ? "/private/tmp" : Path.GetTempPath(), "YamAuth_Regeneration_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var source = Path.Combine(repository.FullName, "src"); var target = Path.Combine(root, "src");
            CopySource(source, target);
            File.Copy(Path.Combine(repository.FullName, "Directory.Build.props"), Path.Combine(root, "Directory.Build.props"));
            // 浮动包版本须固定为当前实际恢复的版本，空源才不会触发在线版本发现。
            foreach (var project in Directory.EnumerateFiles(target, "*.csproj", SearchOption.AllDirectories))
            {
                var original = Path.Combine(source, Path.GetRelativePath(target, project));
                var assets = Path.Combine(Path.GetDirectoryName(original)!, "obj", "project.assets.json");
                if (!File.Exists(assets)) continue;
                using var json = JsonDocument.Parse(File.ReadAllText(assets));
                var resolved = json.RootElement.GetProperty("libraries").EnumerateObject().Select(x => x.Name.Split('/'))
                    .ToDictionary(x => x[0], x => x[1], StringComparer.OrdinalIgnoreCase);
                var xml = XDocument.Load(project);
                foreach (var package in xml.Descendants("PackageReference"))
                    if (package.Attribute("Include") is { } include && resolved.TryGetValue(include.Value, out var version))
                        package.SetAttributeValue("Version", version);
                xml.Save(project);
            }
            var columns = new NullabilityInfoContext();
            var tables = ResourceSecurityCatalog.Resources.Select(rule =>
            {
                var type = typeof(User).Assembly.GetTypes().Single(x => x.Name == rule.Entity);
                return new TableInfo { TableName = rule.Table, EntityName = rule.Entity, Module = rule.Table.Split('_')[1],
                    DatabaseName = rule.Kind == ResourceKind.Owned ? "YamBzss" : "YamBase",
                    Columns = type.GetProperties().Where(x => x.GetCustomAttribute<ColumnAttribute>()?.IsIgnore != true).Select(property =>
                    {
                        var attribute = property.GetCustomAttribute<ColumnAttribute>();
                        var valueType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
                        var sql = valueType == typeof(long) ? "bigint" : valueType == typeof(int) ? "int" : valueType == typeof(bool) ? "bit"
                            : valueType == typeof(DateTime) ? "datetime2" : valueType == typeof(byte[]) ? "rowversion" : valueType == typeof(decimal) ? "decimal" : "nvarchar";
                        return new ColumnInfo { Name = property.Name, SqlType = sql, IsPrimaryKey = attribute?.IsPrimary == true,
                            IsIdentity = attribute?.IsIdentity == true, IsNullable = columns.Create(property).ReadState == NullabilityState.Nullable, MaxLength = 1024 };
                    }).ToList() };
            }).ToList();
            foreach (var table in tables)
            {
                new EntityGenerator { EntityProjectPath = Path.Combine(target, "YamAuth.Entity") }.Generate(table);
                new DtoGenerator { DtosProjectPath = Path.Combine(target, "YamAuth.Dtos") }.Generate(table);
                new RepositoryGenerator { RepositoryProjectPath = Path.Combine(target, "YamAuth.Repository") }.Generate(table);
                new ServiceGenerator { ServiceProjectPath = Path.Combine(target, "YamAuth.Service") }.Generate(table);
                new ControllerGenerator { ApiProjectPath = Path.Combine(target, "YamAuth.Api") }.Generate(table);
            }
            new ValidatorGenerator { ApiProjectPath = Path.Combine(target, "YamAuth.Api"), DtosProjectPath = Path.Combine(target, "YamAuth.Dtos") }.Generate(tables);
            Directory.CreateDirectory(Path.Combine(root, "empty-source"));
            var start = new ProcessStartInfo(Environment.GetEnvironmentVariable("DOTNET_HOST_PATH") ?? "dotnet")
            { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, WorkingDirectory = root };
            foreach (var argument in new[] { "build", Path.Combine(target, "YamAuth.Api", "YamAuth.Api.csproj"), "-c", "Release", "--disable-build-servers", "-m:1", "-nr:false",
                "-p:RestoreSources=" + Path.Combine(root, "empty-source"), "-p:NuGetAudit=false", "--nologo", "-v:quiet" }) start.ArgumentList.Add(argument);
            // 只使用已经恢复的本地包；该回归不读取数据库或在线 NuGet 源。
            using var process = Process.Start(start)!; var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch (OperationCanceledException) { process.Kill(true); throw; }
            var output = await stdout + await stderr;
            Assert.True(process.ExitCode == 0, output);
            ValidateRegeneratedDirectoryRules(Path.Combine(target, "YamAuth.Api", "bin", "Release", "net8.0"));
        }
        finally { Directory.Delete(root, true); }
    }

    static void ValidateRegeneratedDirectoryRules(string output)
    {
        var apiPath = Path.Combine(output, "YamAuth.Api.dll");
        var resolver = new AssemblyDependencyResolver(apiPath);
        var context = new AssemblyLoadContext("generated-validators-" + Guid.NewGuid(), isCollectible: true);
        context.Resolving += (loader, name) => resolver.ResolveAssemblyToPath(name) is { } path ? loader.LoadFromAssemblyPath(path) : null;
        try
        {
            var api = context.LoadFromAssemblyPath(apiPath);
            var dtos = context.LoadFromAssemblyPath(Path.Combine(output, "YamAuth.Dtos.dll"));
            foreach (var operation in new[] { "Create", "Update" })
            {
                var dtoType = dtos.GetType("YamAuth.Dtos.Auth.CrudInfo" + operation + "Dto")!;
                var validators = api.GetTypes().Where(type => type.BaseType?.IsGenericType == true
                    && type.BaseType.GetGenericArguments().Contains(dtoType)).ToArray();
                var validator = Activator.CreateInstance(Assert.Single(validators))!;
                var dto = Activator.CreateInstance(dtoType)!;
                dtoType.GetProperty("CrudCode")!.SetValue(dto, "directory");
                dtoType.GetProperty("NodeType")!.SetValue(dto, "Directory");
                dtoType.GetProperty("ResourceKey")!.SetValue(dto, "");
                dtoType.GetProperty("OperationCode")!.SetValue(dto, "");
                bool Valid()
                {
                    var result = validator.GetType().GetMethod("Validate", new[] { dtoType })!.Invoke(validator, new[] { dto })!;
                    return (bool)result.GetType().GetProperty("IsValid")!.GetValue(result)!;
                }
                Assert.True(Valid());
                dtoType.GetProperty("NodeType")!.SetValue(dto, "Unclassified");
                Assert.False(Valid());
            }
        }
        finally { context.Unload(); }
    }
    static void CopySource(string source, string target)
    {
        Directory.CreateDirectory(target);
        foreach (var file in Directory.EnumerateFiles(source))
            if (!file.EndsWith(".Local.json", StringComparison.OrdinalIgnoreCase)) File.Copy(file, Path.Combine(target, Path.GetFileName(file)));
        foreach (var directory in Directory.EnumerateDirectories(source))
            if (Path.GetFileName(directory) is not ("bin" or "obj" or "logs")) CopySource(directory, Path.Combine(target, Path.GetFileName(directory)));
    }
}
