namespace YamAuth.Dtos;

public class PagedResult<T>
{
    public long Total { get; set; }
    public List<T> Items { get; set; } = new();
}
