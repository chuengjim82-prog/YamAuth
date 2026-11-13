namespace YamAuth.Dtos.Auth;

/// <summary>菜单业务类型；接口与数据库仍使用显式映射的字符串。</summary>
public enum CrudMenuType
{
    Directory,
    Menu
}

public static class CrudMenuTypeCodes
{
    /// <summary>将业务类型转换为持久化及接口代码；未定义枚举值会抛出异常。</summary>
    public static string ToCode(this CrudMenuType type) => type switch
    {
        CrudMenuType.Directory => "dir",
        CrudMenuType.Menu => "menu",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "未定义的菜单类型")
    };

    /// <summary>严格解析接口代码，不接受旧别名、空白或大小写变体；失败时返回 false。</summary>
    public static bool TryParse(string? code, out CrudMenuType type)
    {
        switch (code)
        {
            case "dir": type = CrudMenuType.Directory; return true;
            case "menu": type = CrudMenuType.Menu; return true;
            default: type = default; return false;
        }
    }
}
