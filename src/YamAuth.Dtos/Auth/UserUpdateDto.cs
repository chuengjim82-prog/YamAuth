namespace YamAuth.Dtos.Auth;

public class UserUpdateDto
{
    public string UserName { get; set; } = "";
    public string NickName { get; set; } = "";
    public string Avatar { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? Remark { get; set; }
}
