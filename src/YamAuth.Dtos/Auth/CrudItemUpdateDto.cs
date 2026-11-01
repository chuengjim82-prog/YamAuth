namespace YamAuth.Dtos.Auth;

public class CrudItemUpdateDto
{
    public long? CrudId { get; set; }
    public long ParentId { get; set; }
    public string Method { get; set; } = "";
    public string? ApiPath { get; set; }
    public string? Remark { get; set; }
}
