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
        sb.AppendLine($"public class {t.EntityName}QueryDto : PagedQuery {{ }}");
        return sb.ToString();
    }

    static bool IsAuditOrPk(ColumnInfo c) => DtoColumnRules.IsAuditOrPk(c);

    static bool IsSensitive(ColumnInfo c) => DtoColumnRules.IsSensitive(c);

    static bool IsServerOnly(ColumnInfo c) => DtoColumnRules.IsServerOnly(c);
}
