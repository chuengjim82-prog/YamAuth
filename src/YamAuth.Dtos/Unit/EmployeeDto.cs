namespace YamAuth.Dtos.Unit;

public class EmployeeDto
{
    public long Id { get; set; }
    public long? DepartmentId { get; set; }
    public long? UserId { get; set; }
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
    public long? TenantId { get; set; }
    public string[] AllowedActions { get; set; } = Array.Empty<string>();
    public YamAuth.Authorization.RelationLabels RelatedLabels { get; set; } = new();
}
