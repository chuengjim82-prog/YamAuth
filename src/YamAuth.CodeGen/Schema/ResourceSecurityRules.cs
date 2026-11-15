using YamAuth.Authorization;

namespace YamAuth.CodeGen.Schema;

/// <summary>生成器与运行时共用资源清单，未知表必须先明确安全规则。</summary>
public static class ResourceSecurityRules
{
    public static ResourceRule Get(TableInfo table) => ResourceSecurityCatalog.Resources.SingleOrDefault(x => x.Table == table.TableName)
        ?? throw new InvalidOperationException($"表 {table.TableName} 未登记资源安全规则，已拒绝生成公开 CRUD");
}
