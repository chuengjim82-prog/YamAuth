namespace YamAuth.CodeGen.Schema;

/// <summary>层级管理只对已确认业务语义的表启用。</summary>
public static class TreeResourceRules
{
    public static bool IsTree(TableInfo table) => table.DatabaseName == "YamBase"
        && table.Module == "Auth"
        && table.TableName is "tb_Auth_CrudMenu" or "tb_Auth_CrudInfo";
}
