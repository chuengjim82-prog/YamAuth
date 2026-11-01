namespace YamAuth.Dtos.Auth;

public class CrudRoleDto
{
    public long Id { get; set; }
    public long? TenantId { get; set; }
    public long? AppsId { get; set; }
    public long ParentId { get; set; }
    public string? RoleCode { get; set; }
    public string RoleName { get; set; } = "";
    public int? SortIndex { get; set; }
    public bool IsSystem { get; set; }
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
