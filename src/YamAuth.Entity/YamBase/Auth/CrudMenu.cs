using FreeSql.DataAnnotations;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Entity.YamBase.Auth;

[Table(Name = "tb_Auth_CrudMenu")]
public class CrudMenu : IAuditEntity
{
    [Column(IsPrimary = true, IsIdentity = true, Name = "Id")]
    public long Id { get; set; }

    [Column(Name = "CrudId")]
    public long? CrudId { get; set; }

    [Column(Name = "ParentId")]
    public long ParentId { get; set; }

    [Column(Name = "MenuCode")]
    public string MenuCode { get; set; } = "";

    [Column(Name = "MenuName")]
    public string? MenuName { get; set; }

    [Column(Name = "MenuType")]
    public string MenuType { get; set; } = "";

    [Column(Name = "IconName")]
    public string IconName { get; set; } = "";

    [Column(Name = "RoutePath")]
    public string? RoutePath { get; set; }

    [Column(Name = "Redirect")]
    public string? Redirect { get; set; }

    [Column(Name = "OpenType")]
    public bool? OpenType { get; set; }

    [Column(Name = "SortIndex")]
    public int SortIndex { get; set; }

    [Column(Name = "IsHided")]
    public bool IsHided { get; set; }

    [Column(Name = "AllowAny")]
    public bool AllowAny { get; set; }

    [Column(Name = "Remark")]
    public string? Remark { get; set; }

    [Column(Name = "IsDeleted")]
    public bool IsDeleted { get; set; }

    [Column(Name = "CreatorId")]
    public long CreatorId { get; set; }

    [Column(Name = "CreatorNic")]
    public string CreatorNic { get; set; } = "";

    [Column(Name = "CreateTime")]
    public DateTime CreateTime { get; set; }

    [Column(Name = "UpdaterId")]
    public long? UpdaterId { get; set; }

    [Column(Name = "UpdaterNic")]
    public string? UpdaterNic { get; set; }

    [Column(Name = "UpdateTime")]
    public DateTime? UpdateTime { get; set; }

    [Column(Name = "DeleterId")]
    public long? DeleterId { get; set; }

    [Column(Name = "DeleterNic")]
    public string? DeleterNic { get; set; }

    [Column(Name = "DeleteTime")]
    public DateTime? DeleteTime { get; set; }

}
