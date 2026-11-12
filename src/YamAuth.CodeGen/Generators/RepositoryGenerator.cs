using System.Text;
using YamAuth.CodeGen.Schema;

namespace YamAuth.CodeGen.Generators;

public class RepositoryGenerator
{
    public string RepositoryProjectPath { get; init; } = "";

    public void Generate(TableInfo t)
    {
        var dir = Path.Combine(RepositoryProjectPath, t.DatabaseName, t.Module, t.EntityName);
        Directory.CreateDirectory(dir);

        File.WriteAllText(Path.Combine(dir, $"I{t.EntityName}Repository.cs"), BuildInterface(t));
        File.WriteAllText(Path.Combine(dir, $"{t.EntityName}Repository.cs"), BuildImplementation(t));
    }

    string BuildInterface(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"using YamAuth.Entity.{t.DatabaseName}.{t.Module};");
        sb.AppendLine("using YamAuth.Repository.Abstractions;");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Repository.{t.DatabaseName}.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"public partial interface I{t.EntityName}Repository : IRepository");
        sb.AppendLine("{");
        sb.AppendLine($"    Task<{t.EntityName}?> GetAsync(long id);");
        sb.AppendLine($"    Task<(long total, List<{t.EntityName}> items)> PageAsync(int page, int size, string? keyword{(QueryResourceRules.SupportsAll(t) ? ", bool all = false" : "")});");
        sb.AppendLine($"    Task<long> InsertAsync({t.EntityName} entity);");
        sb.AppendLine($"    Task<int> UpdateAsync({t.EntityName} entity);");
        sb.AppendLine($"    Task<int> SoftDeleteAsync(long id);");
        sb.AppendLine("}");
        return sb.ToString();
    }

    string BuildImplementation(TableInfo t)
    {
        var dbKey = t.DatabaseName == "YamBase" ? "DbKeys.Base" : "DbKeys.Bzss";
        var sb = new StringBuilder();
        sb.AppendLine("using FreeSql;");
        sb.AppendLine("using Microsoft.Extensions.DependencyInjection;");
        sb.AppendLine($"using YamAuth.Entity.{t.DatabaseName}.{t.Module};");
        sb.AppendLine("using YamAuth.Repository.Abstractions;");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Repository.{t.DatabaseName}.{t.Module};");
        sb.AppendLine();

        sb.AppendLine($"public partial class {t.EntityName}Repository : RepositoryBase<{t.EntityName}>, I{t.EntityName}Repository");
        sb.AppendLine("{");
        sb.AppendLine($"    public {t.EntityName}Repository(");
        sb.AppendLine($"        [FromKeyedServices({dbKey})] IFreeSql fsql,");
        sb.AppendLine("        ICurrentUser currentUser)");
        sb.AppendLine("        : base(fsql, currentUser) { }");
        sb.AppendLine();
        sb.AppendLine($"    public Task<{t.EntityName}?> GetAsync(long id) => GetByIdAsync(id);");
        sb.AppendLine($"    public Task<long> InsertAsync({t.EntityName} entity) => InsertEntityAsync(entity);");
        sb.AppendLine($"    public Task<int> UpdateAsync({t.EntityName} entity) => UpdateEntityAsync(entity);");
        sb.AppendLine($"    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);");
        sb.AppendLine(BuildPlainPageAsync(t));
        sb.AppendLine("}");
        return sb.ToString();
    }

    static string BuildPlainPageAsync(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine();
        sb.AppendLine($"    public async Task<(long total, List<{t.EntityName}> items)> PageAsync(int page, int size, string? keyword{(QueryResourceRules.SupportsAll(t) ? ", bool all = false" : "")})");
        sb.AppendLine("    {");
        sb.AppendLine("        var select = Repo.Select.Where(x => !x.IsDeleted);");
        sb.AppendLine("        var kw = KeywordQueryExtensions.Normalize(keyword);");
        var searchable = t.Columns
            .Where(c => TypeMapper.ToCSharp(c).StartsWith("string", StringComparison.Ordinal)
                && c.Name is not ("Password" or "PwdSalt" or "AppSecret"))
            .Select(c => c.Name)
            .ToList();
        if (searchable.Count > 0)
        {
            var expr = string.Join(" || ", searchable.Select(name => $"(x.{name} != null && x.{name}.Contains(kw))"));
            sb.AppendLine("        if (kw != null)");
            sb.AppendLine("        {");
            sb.AppendLine($"            select = select.Where(x => {expr});");
            sb.AppendLine("        }");
        }
        if (QueryResourceRules.SupportsAll(t))
        {
            var sortColumn = t.Columns.FirstOrDefault(c => c.Name == "SortIndex");
            var sort = sortColumn == null ? "" : $".OrderBy(x => x.SortIndex{(sortColumn.IsNullable ? " ?? 0" : "")})";
            sb.AppendLine("        if (all)");
            sb.AppendLine("        {");
            sb.AppendLine($"            var allItems = await select{sort}.OrderBy(x => x.Id).ToListAsync();");
            sb.AppendLine("            return (allItems.Count, allItems);");
            sb.AppendLine("        }");
        }
        sb.AppendLine("        var total = await select.CountAsync();");
        var stableOrder = QueryResourceRules.UsesStablePaging(t) ? ".OrderByDescending(x => x.Id)" : "";
        sb.AppendLine($"        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime){stableOrder}.ToListAsync();");
        sb.AppendLine("        return (total, items);");
        sb.AppendLine("    }");
        return sb.ToString();
    }
}
