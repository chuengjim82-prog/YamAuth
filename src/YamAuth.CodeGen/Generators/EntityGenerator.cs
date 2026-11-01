using System.Text;
using YamAuth.CodeGen.Schema;

namespace YamAuth.CodeGen.Generators;

public class EntityGenerator
{
    public string EntityProjectPath { get; init; } = "";

    // 接口 IAuditEntity 要求的审计字段；若 DB 表缺失，则补成 [Column(IsIgnore=true)] 占位以满足接口
    private static readonly (string Name, string Type)[] RequiredAuditFields = new[]
    {
        ("IsDeleted", "bool"),
        ("CreatorId", "long"),
        ("CreatorNic", "string"),
        ("CreateTime", "DateTime"),
        ("UpdaterId", "long?"),
        ("UpdaterNic", "string?"),
        ("UpdateTime", "DateTime?"),
        ("DeleterId", "long?"),
        ("DeleterNic", "string?"),
        ("DeleteTime", "DateTime?"),
    };

    public void Generate(TableInfo t)
    {
        var dir = Path.Combine(EntityProjectPath, t.DatabaseName, t.Module);
        Directory.CreateDirectory(dir);
        var file = Path.Combine(dir, $"{t.EntityName}.cs");

        var sb = new StringBuilder();
        sb.AppendLine("using FreeSql.DataAnnotations;");
        sb.AppendLine("using YamAuth.Entity.Abstractions;");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Entity.{t.DatabaseName}.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"[Table(Name = \"{t.TableName}\")]");
        sb.AppendLine($"public class {t.EntityName} : IAuditEntity");
        sb.AppendLine("{");
        var existingColumns = new HashSet<string>(t.Columns.Select(c => c.Name), StringComparer.OrdinalIgnoreCase);
        foreach (var c in t.Columns)
        {
            sb.Append("    [Column(");
            var parts = new List<string>();
            if (c.IsPrimaryKey) parts.Add("IsPrimary = true");
            if (c.IsIdentity) parts.Add("IsIdentity = true");
            parts.Add($"Name = \"{c.Name}\"");
            sb.Append(string.Join(", ", parts));
            sb.AppendLine(")]");
            var type = TypeMapper.ToCSharp(c);
            var defaultInit = type == "string" ? " = \"\";" : "";
            sb.AppendLine($"    public {type} {c.Name} {{ get; set; }}{defaultInit}");
            sb.AppendLine();
        }
        // 补齐 IAuditEntity 要求但 DB 表缺失的字段（不参与持久化）
        foreach (var (name, type) in RequiredAuditFields)
        {
            if (existingColumns.Contains(name)) continue;
            var defaultInit = type == "string" ? " = \"\";" : "";
            sb.AppendLine("    [Column(IsIgnore = true)]");
            sb.AppendLine($"    public {type} {name} {{ get; set; }}{defaultInit}");
            sb.AppendLine();
        }
        sb.AppendLine("}");

        File.WriteAllText(file, sb.ToString());
    }
}
