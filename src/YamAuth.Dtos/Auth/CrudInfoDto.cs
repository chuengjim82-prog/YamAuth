namespace YamAuth.Dtos.Auth;

public class CrudInfoDto
{
    public long Id { get; set; }
    public long? AppsId { get; set; }
    public long ParentId { get; set; }
    public string? CrudName { get; set; }
    public string CrudCode { get; set; } = "";
    public int CrudType { get; set; }
    public int SortIndex { get; set; }
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
