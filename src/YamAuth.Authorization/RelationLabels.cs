namespace YamAuth.Authorization;

/// <summary>只包含已获准读取记录所引用对象的最小显示名。</summary>
public sealed class RelationLabels
{
    public string? Tenant { get; set; }
    public string? Department { get; set; }
    public string? User { get; set; }
    public string? App { get; set; }
    public string? CrudRole { get; set; }
    public string? DataRole { get; set; }
    public string? CrudInfo { get; set; }
    public string? OwnerUser { get; set; }
    public string? OwnerDepartment { get; set; }
}
