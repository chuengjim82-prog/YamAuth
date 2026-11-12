using System.Text;
using YamAuth.CodeGen.Schema;

namespace YamAuth.CodeGen.Generators;

public class ServiceGenerator
{
    public string ServiceProjectPath { get; init; } = "";

    public void Generate(TableInfo t)
    {
        var dir = Path.Combine(ServiceProjectPath, t.DatabaseName, t.Module);
        Directory.CreateDirectory(dir);

        File.WriteAllText(Path.Combine(dir, $"I{t.EntityName}Service.cs"), BuildInterface(t));
        File.WriteAllText(Path.Combine(dir, $"{t.EntityName}Service.cs"), BuildImplementation(t));
    }

    string BuildInterface(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine("using YamAuth.Service.Abstractions;");
        sb.AppendLine("using YamAuth.Dtos;");
        sb.AppendLine($"using YamAuth.Dtos.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Service.{t.DatabaseName}.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"public partial interface I{t.EntityName}Service : IService");
        sb.AppendLine("{");
        sb.AppendLine($"    Task<{t.EntityName}Dto?> GetAsync(long id);");
        sb.AppendLine($"    Task<PagedResult<{t.EntityName}Dto>> PageAsync({t.EntityName}QueryDto q);");
        sb.AppendLine($"    Task<long> CreateAsync({t.EntityName}CreateDto dto);");
        sb.AppendLine($"    Task UpdateAsync(long id, {t.EntityName}UpdateDto dto);");
        sb.AppendLine($"    Task DeleteAsync(long id);");
        sb.AppendLine("}");
        return sb.ToString();
    }

    string BuildImplementation(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"using YamAuth.Entity.{t.DatabaseName}.{t.Module};");
        sb.AppendLine($"using YamAuth.Repository.{t.DatabaseName}.{t.Module};");
        sb.AppendLine("using YamAuth.Service.Abstractions;");
        sb.AppendLine("using YamAuth.Dtos;");
        sb.AppendLine($"using YamAuth.Dtos.{t.Module};");
        sb.AppendLine("using Mapster;");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Service.{t.DatabaseName}.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"public partial class {t.EntityName}Service : I{t.EntityName}Service");
        sb.AppendLine("{");
        sb.AppendLine($"    private readonly I{t.EntityName}Repository _repo;");
        sb.AppendLine();
        sb.AppendLine($"    public {t.EntityName}Service(I{t.EntityName}Repository repo)");
        sb.AppendLine("    {");
        sb.AppendLine("        _repo = repo;");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine($"    public async Task<{t.EntityName}Dto?> GetAsync(long id)");
        sb.AppendLine("    {");
        sb.AppendLine("        var e = await _repo.GetAsync(id);");
        sb.AppendLine($"        return e == null ? null : e.Adapt<{t.EntityName}Dto>();");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine($"    public async Task<PagedResult<{t.EntityName}Dto>> PageAsync({t.EntityName}QueryDto q)");
        sb.AppendLine("    {");
        sb.AppendLine($"        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword{(QueryResourceRules.SupportsAll(t) ? ", q.All" : "")});");
        sb.AppendLine($"        return new PagedResult<{t.EntityName}Dto>");
        sb.AppendLine("        {");
        sb.AppendLine("            Total = total,");
        sb.AppendLine($"            Items = items.Adapt<List<{t.EntityName}Dto>>()");
        sb.AppendLine("        };");
        sb.AppendLine("    }");
        sb.AppendLine();
        if (TreeResourceRules.IsTree(t))
        {
            sb.AppendLine($"    // 层级校验和事务写入见 {t.EntityName}Service.Extensions.cs。");
        }
        else if (HasPasswordColumn(t))
        {
            sb.AppendLine($"    // CreateAsync / UpdateAsync 含密码哈希，见 {t.EntityName}Service.Extensions.cs");
            sb.AppendLine($"    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);");
        }
        else
        {
            sb.AppendLine($"    public Task<long> CreateAsync({t.EntityName}CreateDto dto)");
            sb.AppendLine($"        => _repo.InsertAsync(dto.Adapt<{t.EntityName}>());");
            sb.AppendLine();
            sb.AppendLine($"    public async Task UpdateAsync(long id, {t.EntityName}UpdateDto dto)");
            sb.AppendLine("    {");
            sb.AppendLine("        var e = await _repo.GetAsync(id) ?? throw new BusinessException(\"记录不存在\", 404);");
            sb.AppendLine("        dto.Adapt(e);");
            sb.AppendLine("        e.Id = id;");
            sb.AppendLine("        await _repo.UpdateAsync(e);");
            sb.AppendLine("    }");
            sb.AppendLine();
            sb.AppendLine($"    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);");
        }
        sb.AppendLine("}");
        return sb.ToString();
    }

    static bool HasPasswordColumn(TableInfo t) => t.Columns.Any(c => c.Name == "Password");
}
