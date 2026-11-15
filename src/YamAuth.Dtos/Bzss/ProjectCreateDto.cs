namespace YamAuth.Dtos.Bzss;

public class ProjectCreateDto
{
    public string? ProjCode { get; set; }
    public string? ProjName { get; set; }
    public string? Remark { get; set; }
    public long? OwnerUserId { get; set; }
    public long? OwnerDepartmentId { get; set; }
}
