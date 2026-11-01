namespace YamAuth.Dtos.Auth;

public class CrudInfoUpdateDto
{
    public long? AppsId { get; set; }
    public long ParentId { get; set; }
    public string? CrudName { get; set; }
    public string CrudCode { get; set; } = "";
    public int CrudType { get; set; }
    public int SortIndex { get; set; }
    public string? Remark { get; set; }
}
