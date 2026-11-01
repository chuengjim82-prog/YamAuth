namespace YamAuth.Dtos.Auth;

public class MenuTreeDto
{
    public long Id { get; set; }
    public long ParentId { get; set; }
    public string MenuName { get; set; } = "";
    public string MenuUrl { get; set; } = "";
    public string MenuIcon { get; set; } = "";
    public List<MenuTreeDto> Children { get; set; } = new();
}
