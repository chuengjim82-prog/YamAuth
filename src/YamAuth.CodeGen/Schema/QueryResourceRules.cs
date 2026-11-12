namespace YamAuth.CodeGen.Schema;

/// <summary>查询能力独立于层级写入规则，启用全量查询不会改变新增、修改或删除逻辑。</summary>
public static class QueryResourceRules
{
    public static bool SupportsAll(TableInfo table) => TreeResourceRules.IsTree(table) || UsesStablePaging(table);

    /// <summary>这四类资源保留分页兼容入口，并以唯一编号消除创建时间相同时的排序歧义。</summary>
    public static bool UsesStablePaging(TableInfo table) => table.DatabaseName == "YamBase"
        && table.Module == "Auth"
        && table.TableName is "tb_Auth_AppsInfo" or "tb_Auth_CrudItem" or "tb_Auth_CrudRole" or "tb_Auth_DataRole";
}
