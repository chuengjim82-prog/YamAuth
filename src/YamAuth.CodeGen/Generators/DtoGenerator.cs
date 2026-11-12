using System.Text;
using YamAuth.CodeGen.Schema;

namespace YamAuth.CodeGen.Generators;

public class DtoGenerator
{
    public string DtosProjectPath { get; init; } = "";

    public void Generate(TableInfo t)
    {
        var dir = Path.Combine(DtosProjectPath, t.Module);
        Directory.CreateDirectory(dir);

        File.WriteAllText(Path.Combine(dir, $"{t.EntityName}Dto.cs"), BuildDto(t));
        File.WriteAllText(Path.Combine(dir, $"{t.EntityName}CreateDto.cs"), BuildCreateDto(t));
        File.WriteAllText(Path.Combine(dir, $"{t.EntityName}UpdateDto.cs"), BuildUpdateDto(t));
        File.WriteAllText(Path.Combine(dir, $"{t.EntityName}QueryDto.cs"), BuildQueryDto(t));
    }

    string BuildDto(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"namespace YamAuth.Dtos.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"public class {t.EntityName}Dto");
        sb.AppendLine("{");
        foreach (var c in t.Columns)
        {
            if (IsSensitive(c)) continue;
            var type = TypeMapper.ToCSharp(c);
            var defaultInit = type == "string" ? " = \"\";" : "";
            sb.AppendLine($"    public {type} {c.Name} {{ get; set; }}{defaultInit}");
        }
        sb.AppendLine("}");
        return sb.ToString();
    }

    string BuildCreateDto(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"namespace YamAuth.Dtos.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"public class {t.EntityName}CreateDto");
        sb.AppendLine("{");
        foreach (var c in t.Columns)
        {
            if (IsAuditOrPk(c) || IsServerOnly(c)) continue;
            var type = TypeMapper.ToCSharp(c);
            var defaultInit = type == "string" ? " = \"\";" : "";
            sb.AppendLine($"    public {type} {c.Name} {{ get; set; }}{defaultInit}");
        }
        sb.AppendLine("}");
        return sb.ToString();
    }

    string BuildUpdateDto(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"namespace YamAuth.Dtos.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"public class {t.EntityName}UpdateDto");
        sb.AppendLine("{");
        foreach (var c in t.Columns)
        {
            if (IsAuditOrPk(c) || IsServerOnly(c)) continue;
            if (c.Name == "Password")
            {
                sb.AppendLine("    /// <summary>留空表示不修改密码</summary>");
                sb.AppendLine("    public string? Password { get; set; }");
                continue;
            }
            var type = TypeMapper.ToCSharp(c);
            var defaultInit = type == "string" ? " = \"\";" : "";
            sb.AppendLine($"    public {type} {c.Name} {{ get; set; }}{defaultInit}");
        }
        sb.AppendLine("}");
        return sb.ToString();
    }

    string BuildQueryDto(TableInfo t)
    {
        var sb = new StringBuilder();
        sb.AppendLine("using YamAuth.Dtos;");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Dtos.{t.Module};");
        sb.AppendLine();
        if (QueryResourceRules.SupportsAll(t))
        {
            var sortColumn = t.Columns.FirstOrDefault(c => c.Name == "SortIndex");
            var orderDescription = sortColumn == null ? "Id" : "SortIndex、Id";
            sb.AppendLine($"public class {t.EntityName}QueryDto : PagedQuery");
            sb.AppendLine("{");
            sb.AppendLine(QueryResourceRules.UsesStablePaging(t)
                ? "    /// <summary>是否返回全部匹配记录；缺省或 false 时保留分页和 Keyword 过滤，按 CreateTime、Id 降序返回，Size 上限为 200。</summary>"
                : "    /// <summary>是否返回全部匹配记录；缺省或 false 时保留原分页、Keyword 过滤和排序，Size 上限为 200。</summary>");
            sb.AppendLine("    /// <remarks>");
            sb.AppendLine($"    /// true 时忽略 Page/Size，仍应用 Keyword 并排除已删除记录，按 {orderDescription} 升序返回。");
            if (sortColumn?.IsNullable == true)
                sb.AppendLine("    /// SortIndex 为空时按 0 排序。");
            sb.AppendLine("    /// 保留现有响应包装及 data.total/items；items 为平面数组，取全时 total 等于返回记录数。");
            if (t.TableName == "tb_Auth_CrudMenu")
                sb.AppendLine("    /// 菜单管理查询包含隐藏菜单，沿用原接口的授权与可见范围。");
            sb.AppendLine("    /// </remarks>");
            sb.AppendLine("    public bool All { get; set; }");
            sb.AppendLine("}");
        }
        else sb.AppendLine($"public class {t.EntityName}QueryDto : PagedQuery {{ }}");
        return sb.ToString();
    }

    static bool IsAuditOrPk(ColumnInfo c) => DtoColumnRules.IsAuditOrPk(c);

    static bool IsSensitive(ColumnInfo c) => DtoColumnRules.IsSensitive(c);

    static bool IsServerOnly(ColumnInfo c) => DtoColumnRules.IsServerOnly(c);
}
