using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.Auth;

/// <summary>登录：校验用户名/密码、签发 JWT（仅身份，不含权限）、修改密码</summary>
public class AuthLoginService : IAuthLoginService
{
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration _cfg;
    private readonly ICurrentUser _current;

    public AuthLoginService(IUserRepository userRepo, IConfiguration cfg, ICurrentUser current)
    {
        _userRepo = userRepo;
        _cfg = cfg;
        _current = current;
    }

    public async Task<LoginResultDto> LoginAsync(LoginDto dto)
    {
        var account = dto.UserName.Trim();
        var user = await ResolveUserByAccountAsync(account)
            ?? throw new BusinessException("用户名或密码错误");
        if (!user.IsActived) throw new BusinessException("账号已停用");
        if (!PasswordHelper.Verify(dto.Password, user.PwdSalt, user.Password))
            throw new BusinessException("用户名或密码错误");

        var minutes = _cfg.GetValue<int?>("Jwt:AccessTokenMinutes") ?? 120;
        var token = IssueJwt(user.Id, user.NickName, TimeSpan.FromMinutes(minutes));
        return new LoginResultDto
        {
            Token = token,
            ExpiresIn = minutes * 60,
            UserName = user.UserName,
            NickName = user.NickName
        };
    }

    async Task<User?> ResolveUserByAccountAsync(string account)
    {
        if (string.IsNullOrWhiteSpace(account)) return null;
        var byUserName = await _userRepo.FindByUserNameAsync(account);
        if (byUserName != null) return byUserName;
        return await _userRepo.FindByEmailAsync(account);
    }

    public async Task ChangePasswordAsync(ChangePasswordDto dto)
    {
        if (!_current.IsAuthenticated || _current.UserId <= 0)
            throw new BusinessException("未登录", 401);
        var user = await _userRepo.GetAsync(_current.UserId)
            ?? throw new BusinessException("用户不存在", 404);
        if (!PasswordHelper.Verify(dto.OldPassword, user.PwdSalt, user.Password))
            throw new BusinessException("原密码错误", 400);
        if (dto.OldPassword == dto.NewPassword)
            throw new BusinessException("新密码不能与原密码相同", 400);
        var (hash, salt) = PasswordHelper.Hash(dto.NewPassword);
        user.Password = hash;
        user.PwdSalt = salt;
        await _userRepo.UpdateAsync(user);
    }

    string IssueJwt(long userId, string nic, TimeSpan ttl)
    {
        var secret = _cfg["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Jwt:SecretKey 未配置");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new("sub", userId.ToString()),
            new("nic", nic ?? "")
        };
        var jwt = new JwtSecurityToken(
            issuer: _cfg["Jwt:Issuer"],
            audience: _cfg["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.Add(ttl),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
