namespace YamAuth.CodeGen.Schema;

/// <summary>Create/Update DTO 与 Validator 共用的列过滤与元数据规则。</summary>
public static class DtoColumnRules
{
    public static bool IsAuditOrPk(ColumnInfo c) =>
        c.IsPrimaryKey || c.Name is "IsDeleted" or "CreatorId" or "CreatorNic" or "CreateTime"
        or "UpdaterId" or "UpdaterNic" or "UpdateTime"
        or "DeleterId" or "DeleterNic" or "DeleteTime";

    public static bool IsSensitive(ColumnInfo c) => c.Name is "Password" or "PwdSalt";

    public static bool IsServerOnly(ColumnInfo c) => c.Name is "PwdSalt";

    public static bool IncludeInWriteDto(ColumnInfo c) =>
        !IsAuditOrPk(c) && !IsServerOnly(c);

    /// <summary>SQL Server max_length → 字符数（nvarchar/nchar 为字节数的一半）。</summary>
    public static int CharMaxLength(ColumnInfo c)
    {
        if (c.MaxLength <= 0) return 0;
        var isUnicode = c.SqlType is "nvarchar" or "nchar" or "ntext";
        return isUnicode ? c.MaxLength / 2 : c.MaxLength;
    }

    public static bool IsNonNullableString(ColumnInfo c, string csharpType) =>
        csharpType == "string" && !c.IsNullable;

    public static bool IsNullableString(string csharpType) =>
        csharpType is "string?" or "string";
}
