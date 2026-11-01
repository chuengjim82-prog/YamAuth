namespace YamAuth.Dtos.Auth;

public class CrudMenuDto
{
    public long Id { get; set; }
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
    public bool IsDeleted { get; set; }
    public long CreatorId { get; set; }
    public string CreatorNic { get; set; } = "";
    public DateTime CreateTime { get; set; }
    public long? UpdaterId { get; set; }
    public string? UpdaterNic { get; set; }
    public DateTime? UpdateTime { get; set; }
    public long? DeleterId { get; set; }
    public string? DeleterNic { get; set; }
    public DateTime? DeleteTime { get; set; }
}
