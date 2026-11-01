using FreeSql.DataAnnotations;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Entity.YamBase.Auth;

[Table(Name = "tb_Auth_CrudRoleCrud")]
public class CrudRoleCrud : IAuditEntity
{
    [Column(IsPrimary = true, IsIdentity = true, Name = "Id")]
    public long Id { get; set; }

    [Column(Name = "CrudRoleId")]
    public long CrudRoleId { get; set; }

    [Column(Name = "CrudInfoId")]
    public long CrudInfoId { get; set; }

    [Column(Name = "IsDeleted")]
    public bool IsDeleted { get; set; }

    [Column(Name = "CreatorId")]
    public long CreatorId { get; set; }

    [Column(Name = "CreatorNic")]
    public string CreatorNic { get; set; } = "";

    [Column(Name = "CreateTime")]
    public DateTime CreateTime { get; set; }

    [Column(Name = "DeleterId")]
    public long? DeleterId { get; set; }

    [Column(Name = "DeleterNic")]
    public string? DeleterNic { get; set; }

    [Column(Name = "DeleteTime")]
    public DateTime? DeleteTime { get; set; }

    [Column(IsIgnore = true)]
    public long? UpdaterId { get; set; }

    [Column(IsIgnore = true)]
    public string? UpdaterNic { get; set; }

    [Column(IsIgnore = true)]
    public DateTime? UpdateTime { get; set; }

}
