using Microsoft.Data.SqlClient;

namespace YamAuth.CodeGen.Schema;

public class SchemaReader
{
    private const string TablesSql = @"
SELECT name FROM sys.tables WHERE name LIKE 'tb[_]%' ORDER BY name;";

    private const string ColumnsSql = @"
SELECT c.name AS ColName, t.name AS SqlType, c.is_nullable, c.is_identity, c.max_length,
       ISNULL(ic.is_primary_key, 0) AS IsPk
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
INNER JOIN sys.tables tb ON c.object_id = tb.object_id
LEFT JOIN (
    SELECT ic.object_id, ic.column_id, i.is_primary_key
    FROM sys.index_columns ic
    INNER JOIN sys.indexes i ON ic.object_id=i.object_id AND ic.index_id=i.index_id
    WHERE i.is_primary_key=1
) ic ON ic.object_id=c.object_id AND ic.column_id=c.column_id
WHERE tb.name = @t
ORDER BY c.column_id;";

    public List<TableInfo> Read(string databaseName, string connectionString)
    {
        using var conn = new SqlConnection(connectionString);
        conn.Open();

        var tableNames = new List<string>();
        using (var cmd = new SqlCommand(TablesSql, conn))
        using (var r = cmd.ExecuteReader())
            while (r.Read()) tableNames.Add(r.GetString(0));

        var result = new List<TableInfo>();
        foreach (var t in tableNames)
        {
            var info = new TableInfo
            {
                DatabaseName = databaseName,
                TableName = t,
                Module = ParseModule(t),
                EntityName = ParseEntityName(t)
            };
            using (var cmd = new SqlCommand(ColumnsSql, conn))
            {
                cmd.Parameters.AddWithValue("@t", t);
                using var r = cmd.ExecuteReader();
                while (r.Read())
                {
                    info.Columns.Add(new ColumnInfo
                    {
                        Name = r.GetString(0),
                        SqlType = r.GetString(1),
                        IsNullable = r.GetBoolean(2),
                        IsIdentity = r.GetBoolean(3),
                        MaxLength = r.GetInt16(4),
                        IsPrimaryKey = Convert.ToInt32(r.GetValue(5)) == 1
                    });
                }
            }
            result.Add(info);
        }
        return result;
    }

    // tb_Auth_User → "Auth"
    static string ParseModule(string tableName)
    {
        var parts = tableName.Split('_');
        if (parts.Length < 3) throw new InvalidOperationException($"表名 {tableName} 不符合 tb_<Module>_<Entity> 规则");
        return parts[1];
    }

    // tb_Auth_MenuRoleMenu → "MenuRoleMenu"
    static string ParseEntityName(string tableName)
    {
        var idx = tableName.IndexOf('_');
        idx = tableName.IndexOf('_', idx + 1);
        return tableName.Substring(idx + 1);
    }
}
