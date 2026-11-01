namespace YamAuth.Dtos;

public class PagedQuery
{
    private int _page = 1;
    private int _size = 20;

    /// <summary>页码，最小 1</summary>
    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    /// <summary>每页条数，限制在 [1, 200] 防止一次性拉全表</summary>
    public int Size
    {
        get => _size;
        set => _size = value < 1 ? 1 : (value > 200 ? 200 : value);
    }

    public string? Keyword { get; set; }
}
