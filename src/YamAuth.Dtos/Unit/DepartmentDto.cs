namespace YamAuth.Dtos.Unit;

public class DepartmentDto
{
    public long Id { get; set; }
    public long? TenantId { get; set; }
    public string? DeptName { get; set; }
    public int? EmpCount { get; set; }
    public long? DirectorId { get; set; }
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
