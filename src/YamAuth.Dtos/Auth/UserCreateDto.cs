namespace YamAuth.Dtos.Auth;

public class UserCreateDto
{
    public string UserName { get; set; } = "";
    public string NickName { get; set; } = "";
    public string Password { get; set; } = "";
    public string Avatar { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Remark { get; set; }
}
