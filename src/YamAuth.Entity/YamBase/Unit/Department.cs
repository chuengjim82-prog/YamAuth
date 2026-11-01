using FreeSql.DataAnnotations;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Entity.YamBase.Unit;

[Table(Name = "tb_Unit_Department")]
public class Department : IAuditEntity
{
    [Column(IsPrimary = true, IsIdentity = true, Name = "Id")]
    public long Id { get; set; }

    [Column(Name = "TenantId")]
    public long? TenantId { get; set; }

    [Column(Name = "DeptName")]
    public string? DeptName { get; set; }

    [Column(Name = "EmpCount")]
    public int? EmpCount { get; set; }

    [Column(Name = "DirectorId")]
    public long? DirectorId { get; set; }

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
