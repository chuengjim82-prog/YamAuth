namespace YamAuth.Dtos.Unit;

public class DepartmentCreateDto
{
    public long? TenantId { get; set; }
    public string? DeptName { get; set; }
    public int? EmpCount { get; set; }
    public long? DirectorId { get; set; }
    public string? Remark { get; set; }
}
