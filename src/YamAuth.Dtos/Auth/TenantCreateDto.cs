namespace YamAuth.Dtos.Auth;

public class TenantCreateDto
{
    public string? TenantCode { get; set; }
    public string? TenantName { get; set; }
    public bool IsActived { get; set; }
    public string? Remark { get; set; }
}
