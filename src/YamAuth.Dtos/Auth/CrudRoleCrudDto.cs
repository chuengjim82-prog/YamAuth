namespace YamAuth.Dtos.Auth;

public class CrudRoleCrudDto
{
    public long Id { get; set; }
    public long CrudRoleId { get; set; }
    public long CrudInfoId { get; set; }
    public bool IsDeleted { get; set; }
    public long CreatorId { get; set; }
    public string CreatorNic { get; set; } = "";
    public DateTime CreateTime { get; set; }
    public long? DeleterId { get; set; }
    public string? DeleterNic { get; set; }
    public DateTime? DeleteTime { get; set; }
}
