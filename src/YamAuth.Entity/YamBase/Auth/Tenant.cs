using FreeSql.DataAnnotations;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Entity.YamBase.Auth;

[Table(Name = "tb_Auth_Tenant")]
public class Tenant : IAuditEntity
{
    [Column(IsPrimary = true, IsIdentity = true, Name = "Id")]
    public long Id { get; set; }

    [Column(Name = "TenantCode")]
    public string? TenantCode { get; set; }

    [Column(Name = "TenantName")]
    public string? TenantName { get; set; }

    [Column(Name = "IsActived")]
    public bool IsActived { get; set; }

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
