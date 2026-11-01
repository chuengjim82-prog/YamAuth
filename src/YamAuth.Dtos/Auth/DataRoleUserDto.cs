namespace YamAuth.Dtos.Auth;

public class DataRoleUserDto
{
    public long Id { get; set; }
    public long RoleId { get; set; }
    public long UserId { get; set; }
    public bool IsDeleted { get; set; }
    public long CreatorId { get; set; }
    public string CreatorNic { get; set; } = "";
    public DateTime CreateTime { get; set; }
    public long? DeleterId { get; set; }
    public string? DeleterNic { get; set; }
    public DateTime? DeleteTime { get; set; }
}
