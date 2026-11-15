namespace YamAuth.Dtos.Auth;

public class CrudRoleCrudCreateDto
{
    public long CrudRoleId { get; set; }
    public long CrudInfoId { get; set; }
    public string ScopeType { get; set; } = "";
}
