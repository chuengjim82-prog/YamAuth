namespace YamAuth.Dtos.Auth;

public class AppsInfoDto
{
    public long Id { get; set; }
    public long? TenantId { get; set; }
    public long? ParentId { get; set; }
    public string? AppsCode { get; set; }
    public string? AppsName { get; set; }
    public string AppKey { get; set; } = "";
    public string AppSecret { get; set; } = "";
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
