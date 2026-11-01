namespace YamAuth.Dtos.Bzss;

public class CompanyUpdateDto
{
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
}
