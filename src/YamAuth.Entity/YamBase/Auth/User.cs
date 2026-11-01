using FreeSql.DataAnnotations;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Entity.YamBase.Auth;

[Table(Name = "tb_Auth_User")]
public class User : IAuditEntity
{
    [Column(IsPrimary = true, IsIdentity = true, Name = "Id")]
    public long Id { get; set; }

    [Column(Name = "TenantId")]
    public long? TenantId { get; set; }

    [Column(Name = "UserName")]
    public string UserName { get; set; } = "";

    [Column(Name = "NickName")]
    public string NickName { get; set; } = "";

    [Column(Name = "Password")]
    public string Password { get; set; } = "";

    [Column(Name = "PwdSalt")]
    public string PwdSalt { get; set; } = "";

    [Column(Name = "Avatar")]
    public string Avatar { get; set; } = "";

    [Column(Name = "Phone")]
    public string Phone { get; set; } = "";

    [Column(Name = "Email")]
    public string Email { get; set; } = "";

    [Column(Name = "IsAdmin")]
    public bool IsAdmin { get; set; }

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
