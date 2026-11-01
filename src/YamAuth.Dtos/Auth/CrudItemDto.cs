namespace YamAuth.Dtos.Auth;

public class CrudItemDto
{
    public long Id { get; set; }
    public long? CrudId { get; set; }
    public long ParentId { get; set; }
    public string Method { get; set; } = "";
    public string? ApiPath { get; set; }
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
