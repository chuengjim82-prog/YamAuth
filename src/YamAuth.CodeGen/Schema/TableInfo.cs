namespace YamAuth.CodeGen.Schema;

public class TableInfo
{
    public string DatabaseName { get; set; } = "";    // YamBase
    public string TableName { get; set; } = "";        // tb_Auth_User
    public string Module { get; set; } = "";           // Auth
    public string EntityName { get; set; } = "";       // User
    public List<ColumnInfo> Columns { get; set; } = new();
}
