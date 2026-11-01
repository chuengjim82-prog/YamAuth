namespace YamAuth.Dtos.Auth;

public class AppsInfoCreateDto
{
    public long? TenantId { get; set; }
    public long? ParentId { get; set; }
    public string? AppsCode { get; set; }
    public string? AppsName { get; set; }
    public string AppKey { get; set; } = "";
    public string AppSecret { get; set; } = "";
    public string? Remark { get; set; }
}
