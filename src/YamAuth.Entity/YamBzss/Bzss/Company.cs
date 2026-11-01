using FreeSql.DataAnnotations;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Entity.YamBzss.Bzss;

[Table(Name = "tb_Bzss_Company")]
public class Company : IAuditEntity
{
    [Column(IsPrimary = true, IsIdentity = true, Name = "Id")]
    public long Id { get; set; }

    [Column(Name = "TenantId")]
    public long? TenantId { get; set; }

    [Column(Name = "NameCn")]
    public string? NameCn { get; set; }

    [Column(Name = "NameEn")]
    public string? NameEn { get; set; }

    [Column(Name = "RegistratioNo")]
    public string? RegistratioNo { get; set; }

    [Column(Name = "LegalName")]
    public string? LegalName { get; set; }

    [Column(Name = "CountryId")]
    public long? CountryId { get; set; }

    [Column(Name = "RegDate")]
    public DateTime? RegDate { get; set; }

    [Column(Name = "Classify")]
    public int? Classify { get; set; }

    [Column(Name = "Currency")]
    public string? Currency { get; set; }

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
