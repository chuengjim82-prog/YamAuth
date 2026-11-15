using FreeSql.DataAnnotations;

namespace YamAuth.Entity.YamBase.Auth;

[Table(Name = "tb_Auth_LoginSession")]
public class LoginSession
{
    [Column(IsPrimary = true)] public Guid Id { get; set; }
    public long UserId { get; set; }
    public long SecurityVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

[Table(Name = "tb_Auth_TenantContext")]
public class TenantContext
{
    [Column(IsPrimary = true)] public Guid Id { get; set; }
    public long UserId { get; set; }
    public Guid SessionId { get; set; }
    public long TenantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

[Table(Name = "tb_Auth_LoginIdentifier")]
public class LoginIdentifier
{
    [Column(IsPrimary = true, StringLength = 128)] public string NormalizedValue { get; set; } = "";
    public long UserId { get; set; }
    public bool IsUserName { get; set; }
    public bool IsEmail { get; set; }
}

[Table(Name = "tb_Auth_GrantDepartment")]
public class GrantDepartment
{
    [Column(IsPrimary = true)] public long GrantId { get; set; }
    [Column(IsPrimary = true)] public long DepartmentId { get; set; }
    public long TenantId { get; set; }
}

[Table(Name = "tb_Auth_AuditEvent")]
public class AuditEvent
{
    [Column(IsPrimary = true)] public Guid Id { get; set; }
    public long? UserId { get; set; }
    public Guid? SessionId { get; set; }
    public long? TenantId { get; set; }
    public long? AppsId { get; set; }
    public Guid? ContextId { get; set; }
    [Column(StringLength = 160)] public string Action { get; set; } = "";
    [Column(StringLength = 80)] public string TargetType { get; set; } = "";
    [Column(StringLength = 80)] public string? TargetId { get; set; }
    [Column(StringLength = 20)] public string Result { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    [Column(StringLength = 100)] public string TraceId { get; set; } = "";
    [Column(StringLength = -1)] public string Summary { get; set; } = "{}";
}

/// <summary>业务事务先持久化事件，再由后台幂等汇入统一审计；不依赖跨连接隐式事务。</summary>
[Table(Name = "tb_Auth_AuditOutbox")]
public class AuditOutbox
{
    [Column(IsPrimary = true)] public Guid Id { get; set; }
    [Column(StringLength = -1)] public string Payload { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
}

[Table(Name = "tb_Auth_MigrationIssue")]
public class MigrationIssue
{
    [Column(IsPrimary = true, IsIdentity = true)] public long Id { get; set; }
    public string Resource { get; set; } = "";
    public long RecordId { get; set; }
    public string Reason { get; set; } = "";
    public DateTime? ResolvedAt { get; set; }
}

[Table(Name = "tb_Auth_SchemaVersion")]
public class SchemaVersion
{
    [Column(IsPrimary = true)] public int Version { get; set; }
    public DateTime AppliedAt { get; set; }
}
