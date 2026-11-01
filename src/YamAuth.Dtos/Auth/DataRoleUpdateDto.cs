namespace YamAuth.Dtos.Auth;

public class DataRoleUpdateDto
{
    public long? TenantId { get; set; }
    public long? AppsId { get; set; }
    public long ParentId { get; set; }
    public string? RoleCode { get; set; }
    public string RoleName { get; set; } = "";
    public int? SortIndex { get; set; }
    public bool IsSystem { get; set; }
    public string? Remark { get; set; }
}
