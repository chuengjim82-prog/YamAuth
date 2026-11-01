namespace YamAuth.Dtos.Auth;

public class LoginResultDto
{
    public string Token { get; set; } = "";
    public int ExpiresIn { get; set; }
    public string UserName { get; set; } = "";
    public string NickName { get; set; } = "";
}
