using YamAuth.CodeGen.Schema;

namespace YamAuth.CodeGen.Generators;

/// <summary>
/// Mapster 用约定映射（属性名一致即可），不再需要 Profile 配置文件。
/// 这个类保留以保持代码生成入口稳定，但不再生成任何文件。
/// </summary>
public class MappingGenerator
{
    public string ServiceProjectPath { get; init; } = "";

    public void GenerateForModule(string databaseName, string module, IEnumerable<TableInfo> tables)
    {
        // Intentionally a no-op: Mapster's convention-based mapping removes
        // the need for an explicit Profile class per module. Keeping the
        // method so the code-gen orchestration layer can still call it.
    }
}
