namespace YamAuth.Dtos.Auth;

public class AppsUserUpdateDto
{
    public long? TenantId { get; set; }
    public long? AppsId { get; set; }
    public long? UserId { get; set; }
    public bool IsAdmin { get; set; }
    public string? Remark { get; set; }
}
