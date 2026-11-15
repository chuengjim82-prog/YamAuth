using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using YamAuth.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Authorization;
using YamAuth.Service.Abstractions;

namespace YamAuth.Service.Auth;

/// <summary>登录使用唯一标识关系；令牌仅持有身份、会话和安全版本。</summary>
public class AuthLoginService(SecurityStore store, AccessContext access, IConfiguration cfg) : IAuthLoginService
{
    public Task<LoginResultDto> LoginAsync(LoginDto dto) => store.WriteAsync(async () =>
    {
        var account = SecurityStore.NormalizeIdentifier(dto.UserName);
        var identifier = await store.Select<LoginIdentifier>().Where(x => x.NormalizedValue == account).FirstAsync();
        var user = identifier == null ? null : await store.Select<User>()
            .Where(x => x.Id == identifier.UserId && !x.IsDeleted && x.SecurityReady && x.IsActived).ForUpdate().FirstAsync();
        if (user == null || !PasswordHelper.Verify(dto.Password, user.PwdSalt, user.Password))
            throw new AccessException("用户名或密码错误", 401);
        if (user.IsAdmin ? user.TenantId != null : user.TenantId is not > 0)
            throw new AccessException("账号归属尚未确认", 401);
        if (!user.IsAdmin && !await store.Select<Tenant>().Where(x => x.Id == user.TenantId && !x.IsDeleted && x.IsActived).AnyAsync())
            throw new AccessException("租户已停用", 401);
        var minutes = cfg.GetValue<int?>("Jwt:AccessTokenMinutes") ?? 120;
        if (minutes <= 0) throw new InvalidOperationException("Jwt:AccessTokenMinutes 必须为正数");
        var session = new LoginSession { Id = Guid.NewGuid(), UserId = user.Id, SecurityVersion = user.SecurityVersion,
            CreatedAt = DateTime.UtcNow, ExpiresAt = DateTime.UtcNow.AddMinutes(minutes) };
        await store.Insert(session).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.login", "User", user.Id, summary: new { userId = user.Id }, tenantId: user.TenantId, actorUserId: user.Id, actorSessionId: session.Id);
        return new LoginResultDto { Token = IssueJwt(user, session), ExpiresIn = minutes * 60,
            UserName = user.UserName, NickName = user.NickName };
    });

    public Task ChangePasswordAsync(ChangePasswordDto dto) => store.WriteAsync(async () =>
    {
        var current = access.Require();
        var user = await store.Select<User>().Where(x => x.Id == current.UserId && !x.IsDeleted).ForUpdate().FirstAsync()
            ?? throw new AccessException("用户不存在", 401);
        if (!PasswordHelper.Verify(dto.OldPassword, user.PwdSalt, user.Password)) throw new AccessException("原密码错误", 400);
        if (dto.OldPassword == dto.NewPassword) throw new AccessException("新密码不能与原密码相同", 400);
        var (hash, salt) = PasswordHelper.Hash(dto.NewPassword);
        await store.Update<User>().Where(x => x.Id == user.Id && x.SecurityVersion == current.SecurityVersion)
            .Set(x => x.Password, hash).Set(x => x.PwdSalt, salt).Set(x => x.MustChangePassword, false)
            .Set(x => x.SecurityVersion + 1).ExecuteAffrowsAsync();
        await store.Update<LoginSession>().Where(x => x.UserId == user.Id && x.RevokedAt == null)
            .Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.Update<TenantContext>().Where(x => x.UserId == user.Id && x.RevokedAt == null)
            .Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.me.change_password", "User", user.Id);
    });

    string IssueJwt(User user, LoginSession session)
    {
        var secret = cfg["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret)) throw new InvalidOperationException("Jwt:SecretKey 未配置");
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(cfg["Jwt:Issuer"], cfg["Jwt:Audience"], new[] {
            new Claim("sub", user.Id.ToString()), new Claim("sid", session.Id.ToString()),
            new Claim("sv", user.SecurityVersion.ToString()), new Claim("nic", user.NickName)
        }, expires: session.ExpiresAt, signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
