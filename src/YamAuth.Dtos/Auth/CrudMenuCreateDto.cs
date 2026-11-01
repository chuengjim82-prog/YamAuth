namespace YamAuth.Dtos.Auth;

public class CrudMenuCreateDto
{
    public long? CrudId { get; set; }
    public long ParentId { get; set; }
    public string MenuCode { get; set; } = "";
    public string? MenuName { get; set; }
    public string MenuType { get; set; } = "";
    public string IconName { get; set; } = "";
    public string? RoutePath { get; set; }
    public string? Redirect { get; set; }
    public bool? OpenType { get; set; }
    public int SortIndex { get; set; }
    public bool IsHided { get; set; }
    public bool AllowAny { get; set; }
    public string? Remark { get; set; }
}
