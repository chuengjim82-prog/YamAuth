namespace YamAuth.CodeGen.Schema;

public class ColumnInfo
{
    public string Name { get; set; } = "";
    public string SqlType { get; set; } = "";
    public bool IsNullable { get; set; }
    public bool IsPrimaryKey { get; set; }
    public bool IsIdentity { get; set; }
    public int MaxLength { get; set; }
}
