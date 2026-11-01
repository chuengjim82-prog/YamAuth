using System.Text;

namespace YamAuth.CodeGen;

public static class Naming
{
    // MenuRoleMenu → "menu-role-menus"（kebab 复数）
    public static string ToKebabPlural(string pascal)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < pascal.Length; i++)
        {
            if (i > 0 && char.IsUpper(pascal[i])) sb.Append('-');
            sb.Append(char.ToLowerInvariant(pascal[i]));
        }
        var s = sb.ToString();
        return s.EndsWith("y") ? s.Substring(0, s.Length - 1) + "ies" : s + "s";
    }

    // Country → "Countries"；MenuInfo → "MenuInfos"（PascalCase 复数）
    public static string ToPascalPlural(string pascal)
    {
        return pascal.EndsWith("y") ? pascal.Substring(0, pascal.Length - 1) + "ies" : pascal + "s";
    }
}
