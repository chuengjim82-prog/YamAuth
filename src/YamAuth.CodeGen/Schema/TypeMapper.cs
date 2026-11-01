namespace YamAuth.CodeGen.Schema;

public static class TypeMapper
{
    public static string ToCSharp(ColumnInfo col)
    {
        var baseType = col.SqlType switch
        {
            "bigint" => "long",
            "int" => "int",
            "smallint" => "short",
            "tinyint" => "byte",
            "bit" => "bool",
            "decimal" or "numeric" or "money" or "smallmoney" => "decimal",
            "float" => "double",
            "real" => "float",
            "datetime" or "datetime2" or "smalldatetime" or "date" => "DateTime",
            "datetimeoffset" => "DateTimeOffset",
            "time" => "TimeSpan",
            "uniqueidentifier" => "Guid",
            "varbinary" or "binary" or "image" => "byte[]",
            "varchar" or "nvarchar" or "char" or "nchar" or "text" or "ntext" or "xml" => "string",
            _ => "string"
        };
        // 引用类型（string、byte[]）的可空用 `?` 注解；值类型可空用 Nullable<T>
        if (col.IsNullable)
        {
            return baseType == "string" || baseType == "byte[]" ? baseType + "?" : baseType + "?";
        }
        return baseType;
    }
}
