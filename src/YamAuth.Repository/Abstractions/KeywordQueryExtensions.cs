namespace YamAuth.Repository.Abstractions;

public static class KeywordQueryExtensions
{
    public static string? Normalize(string? keyword) =>
        string.IsNullOrWhiteSpace(keyword) ? null : keyword.Trim();
}
