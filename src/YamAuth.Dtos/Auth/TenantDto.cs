namespace YamAuth.Dtos.Auth;

public class TenantDto
{
    public long Id { get; set; }
    public string? TenantCode { get; set; }
    public string? TenantName { get; set; }
    public bool IsActived { get; set; }
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
    public long AuthorizationVersion { get; set; } = 1;
    public string[] AllowedActions { get; set; } = Array.Empty<string>();
    public YamAuth.Authorization.RelationLabels RelatedLabels { get; set; } = new();
}
