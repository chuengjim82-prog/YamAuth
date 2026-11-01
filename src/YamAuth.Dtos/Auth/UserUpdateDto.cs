namespace YamAuth.Dtos.Auth;

public class UserUpdateDto
{
    public long? TenantId { get; set; }
    public string UserName { get; set; } = "";
    public string NickName { get; set; } = "";
    /// <summary>留空表示不修改密码</summary>
    public string? Password { get; set; }
    public string Avatar { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsAdmin { get; set; }
    public bool IsActived { get; set; }
    public string? Remark { get; set; }
}
