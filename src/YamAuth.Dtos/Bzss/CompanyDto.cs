namespace YamAuth.Dtos.Bzss;

public class CompanyDto
{
    public long Id { get; set; }
    public long? TenantId { get; set; }
    public string? NameCn { get; set; }
    public string? NameEn { get; set; }
    public string? RegistratioNo { get; set; }
    public string? LegalName { get; set; }
    public long? CountryId { get; set; }
    public DateTime? RegDate { get; set; }
    public int? Classify { get; set; }
    public string? Currency { get; set; }
    public string? Remark { get; set; }
    public bool IsDeleted { get; set; }
    public long CreatorId { get; set; }
    public string CreatorNic { get; set; } = "";
    public DateTime CreateTime { get; set; }
    public long? UpdaterId { get; set; }
    public string? UpdaterNic { get; set; }
    public DateTime? UpdateTime { get; set; }
    public long? DeleterId { get; set; }
    public string? DeleterNic { get; set; }
    public DateTime? DeleteTime { get; set; }
}
