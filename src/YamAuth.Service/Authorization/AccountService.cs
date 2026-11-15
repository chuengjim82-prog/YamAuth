using Mapster;
using YamAuth.Authorization;
using YamAuth.Dtos;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Authorization;
using YamAuth.Service.Abstractions;

namespace YamAuth.Service.Authorization;

public sealed class AccountService(SecurityStore store, AccessContext access, DataAccessGuard guard)
{
    public Task UpdateProfileAsync(ProfileUpdateDto dto) => store.WriteAsync(async () =>
    {
        var current = access.Require();
        await store.Update<User>().Where(x => x.Id == current.UserId && !x.IsDeleted)
            .Set(x => x.NickName, dto.NickName).Set(x => x.Avatar, dto.Avatar).Set(x => x.Phone, dto.Phone)
            .Set(x => x.UpdaterId, current.UserId).Set(x => x.UpdateTime, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.me.profile", "User", current.UserId);
    });

    public Task ChangeEmailAsync(EmailChangeDto dto) => store.WriteAsync(async () =>
    {
        var current = access.Require();
        var user = await store.Select<User>().Where(x => x.Id == current.UserId && !x.IsDeleted).ForUpdate().FirstAsync()
            ?? throw new AccessException("账号已失效", 401);
        if (!PasswordHelper.Verify(dto.Password, user.PwdSalt, user.Password)) throw new AccessException("当前密码错误", 400);
        user.Email = dto.Email.Trim().ToLowerInvariant();
        await store.SaveIdentifiersAsync(user);
        await store.Update<User>().Where(x => x.Id == user.Id).Set(x => x.Email, user.Email).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.me.email", "User", user.Id);
    });

    public Task LogoutAsync() => store.WriteAsync(async () =>
    {
        var current = access.Require();
        await store.Update<LoginSession>().Where(x => x.Id == current.SessionId && x.UserId == current.UserId)
            .Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.Update<TenantContext>().Where(x => x.SessionId == current.SessionId && x.RevokedAt == null)
            .Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.logout", "LoginSession", current.SessionId);
    });

    public Task ResetPasswordAsync(long id, ResetPasswordDto dto, bool administrator = false) => store.WriteAsync(async () =>
    {
        var user = await TargetAsync(id, "auth.users.reset_password", administrator);
        if (id == access.Require().UserId) throw new AccessException("本人密码请通过验证原密码的改密入口维护", 400);
        var (hash, salt) = PasswordHelper.Hash(dto.Password);
        await store.Update<User>().Where(x => x.Id == user.Id && !x.IsDeleted)
            .Set(x => x.Password, hash).Set(x => x.PwdSalt, salt).Set(x => x.MustChangePassword, true)
            .Set(x => x.SecurityVersion + 1).ExecuteAffrowsAsync();
        await RevokeAsync(user.Id);
        await store.AuditAsync("auth.users.reset_password", "User", user.Id);
    });

    public Task SetStatusAsync(long id, UserStatusDto dto, bool administrator = false) => store.WriteAsync(async () =>
    {
        var user = await TargetAsync(id, "auth.users.disable", administrator);
        if (!dto.IsActived) await EnsureAdministratorRemainsAsync(user);
        await store.Update<User>().Where(x => x.Id == user.Id && !x.IsDeleted)
            .Set(x => x.IsActived, dto.IsActived).Set(x => x.SecurityVersion + 1).ExecuteAffrowsAsync();
        await RevokeAsync(user.Id);
        if (user.TenantId is long tenant) await store.BumpTenantAsync(tenant);
        await store.AuditAsync("auth.users.disable", "User", user.Id, summary: new { dto.IsActived });
    });

    public Task DeleteAdministratorAsync(long id) => store.WriteAsync(async () =>
    {
        var user = await TargetAsync(id, "auth.users.delete", true);
        await EnsureAdministratorRemainsAsync(user);
        await store.Update<User>().Where(x => x.Id == user.Id && !x.IsDeleted).Set(x => x.IsDeleted, true)
            .Set(x => x.DeleterId, access.Require().UserId).Set(x => x.DeleteTime, DateTime.UtcNow)
            .Set(x => x.SecurityVersion + 1).ExecuteAffrowsAsync();
        await store.Delete<LoginIdentifier>().Where(x => x.UserId == user.Id).ExecuteAffrowsAsync();
        await RevokeAsync(id);
        if (user.TenantId is long tenant) await store.BumpTenantAsync(tenant);
        await store.AuditAsync("auth.administrators.delete", "User", id);
    });

    public Task UpdateAdministratorAsync(long id, UserUpdateDto dto) => store.WriteAsync(async () =>
    {
        var user = await TargetAsync(id, "auth.users.update", true);
        user.UserName = dto.UserName.Trim();
        await store.SaveIdentifiersAsync(user);
        await store.Update<User>().Where(x => x.Id == id && !x.IsDeleted).Set(x => x.UserName, user.UserName)
            .Set(x => x.NickName, dto.NickName).Set(x => x.Avatar, dto.Avatar).Set(x => x.Phone, dto.Phone)
            .Set(x => x.Remark, dto.Remark).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.administrators.update", "User", id);
    });

    public Task SetTenantAdministratorAsync(long id, AdministratorDto dto) => store.WriteAsync(async () =>
    {
        var current = RequirePlatform();
        if (current.TenantId is not long tenant) throw new AccessException("请先进入目标租户", 400);
        // 已停用管理员仍须允许撤销身份；任命则要求账号当前可用。
        var user = await guard.RequireUserAsync(id, requireActive: dto.IsAdministrator);
        var role = await store.Select<CrudRole>().Where(x => !x.IsDeleted && x.TenantId == tenant && x.AppsId == current.BackendAppId
            && x.RoleKind == ResourceSecurityCatalog.TenantAdministrator).ForUpdate().FirstAsync();
        if (role == null)
        {
            role = new CrudRole { TenantId = tenant, AppsId = current.BackendAppId, RoleKind = ResourceSecurityCatalog.TenantAdministrator,
                RoleCode = "tenant-administrator", RoleName = "租户管理员", IsSystem = true, CreatorId = current.UserId,
                CreatorNic = current.NickName, CreateTime = DateTime.UtcNow };
            role.Id = await store.Insert(role).ExecuteIdentityAsync();
        }
        var link = await store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.RoleId == role.Id && x.UserId == id).FirstAsync();
        if (dto.IsAdministrator && link == null)
            await store.Insert(new CrudRoleUser { RoleId = role.Id, UserId = id, TenantId = tenant, AppsId = current.BackendAppId,
                CreatorId = current.UserId, CreatorNic = current.NickName, CreateTime = DateTime.UtcNow }).ExecuteAffrowsAsync();
        else if (!dto.IsAdministrator && link != null)
        {
            await EnsureAdministratorRemainsAsync(user);
            await store.Update<CrudRoleUser>().Where(x => x.Id == link.Id).Set(x => x.IsDeleted, true)
                .Set(x => x.DeleterId, current.UserId).Set(x => x.DeleteTime, DateTime.UtcNow).ExecuteAffrowsAsync();
        }
        await store.BumpTenantAsync(tenant);
        await store.AuditAsync("auth.administrators.appoint", "User", id, summary: new { dto.IsAdministrator });
    });

    public async Task<PagedResult<UserDto>> AdministratorsAsync(PagedQuery query)
    {
        var current = RequirePlatform();
        var select = store.Select<User>().Where(x => !x.IsDeleted && x.SecurityReady);
        if (current.TenantId is long tenant)
        {
            var roles = await store.Select<CrudRole>().Where(x => !x.IsDeleted && x.TenantId == tenant && x.AppsId == current.BackendAppId
                && x.RoleKind == ResourceSecurityCatalog.TenantAdministrator).ToListAsync(x => x.Id);
            var users = await store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.TenantId == tenant && x.AppsId == current.BackendAppId
                && roles.Contains(x.RoleId)).ToListAsync(x => x.UserId);
            select = select.Where(x => x.TenantId == tenant && users.Contains(x.Id));
        }
        else select = select.Where(x => x.IsAdmin && x.TenantId == null);
        var kw = query.Keyword?.Trim();
        if (!string.IsNullOrEmpty(kw)) select = select.Where(x => x.UserName.Contains(kw) || x.NickName.Contains(kw));
        var total = await select.CountAsync();
        var usersDto = (await select.OrderBy(x => x.Id).Page(query.Page, query.Size).ToListAsync()).Adapt<List<UserDto>>();
        return new() { Total = total, Items = usersDto };
    }

    public Task<long> CreatePlatformAdministratorAsync(UserCreateDto dto) => store.WriteAsync(async () =>
    {
        var current = RequirePlatform();
        if (current.TenantId != null) throw new AccessException("请退出租户上下文后创建平台管理员", 400);
        var user = dto.Adapt<User>();
        (user.Password, user.PwdSalt) = PasswordHelper.Hash(dto.Password);
        user.UserName = user.UserName.Trim(); user.Email = user.Email.Trim().ToLowerInvariant();
        user.IsAdmin = true; user.IsActived = true; user.SecurityReady = true; user.MustChangePassword = true; user.SecurityVersion = 1;
        user.CreatorId = current.UserId; user.CreatorNic = current.NickName; user.CreateTime = DateTime.UtcNow;
        user.Id = await store.Insert(user).ExecuteIdentityAsync();
        await store.SaveIdentifiersAsync(user);
        await store.AuditAsync("auth.administrators.create", "User", user.Id);
        return user.Id;
    });

    public Task<TenantContextDto> EnterTenantAsync(EnterTenantDto dto) => store.WriteAsync(async () =>
    {
        var current = RequirePlatform();
        if (!await store.Select<Tenant>().Where(x => x.Id == dto.TenantId && !x.IsDeleted && x.IsActived).AnyAsync())
            throw new AccessException("租户不存在或已停用", 404);
        var session = await store.Select<LoginSession>().Where(x => x.Id == current.SessionId).FirstAsync();
        var context = new TenantContext { Id = Guid.NewGuid(), UserId = current.UserId, SessionId = current.SessionId,
            TenantId = dto.TenantId, CreatedAt = DateTime.UtcNow, ExpiresAt = session.ExpiresAt };
        await store.Insert(context).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.context.enter", "TenantContext", context.Id, tenantId: dto.TenantId);
        return new TenantContextDto(context.Id, context.TenantId, context.ExpiresAt);
    });

    public Task ExitTenantAsync(Guid id) => store.WriteAsync(async () =>
    {
        var current = RequirePlatform();
        var context = await store.Select<TenantContext>().Where(x => x.Id == id && x.UserId == current.UserId && x.SessionId == current.SessionId).FirstAsync()
            ?? throw new AccessException("上下文不存在", 404);
        await store.Update<TenantContext>().Where(x => x.Id == id).Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.AuditAsync("auth.context.exit", "TenantContext", id, tenantId: context.TenantId);
    });

    async Task<User> TargetAsync(long id, string permission, bool administrator)
    {
        if (!administrator)
        {
            access.Demand(permission);
            return await guard.Select<User>(store.Db, permission).Where(x => x.Id == id).ForUpdate().FirstAsync()
                ?? throw new AccessException("账号不存在或不在允许操作的范围内", 404);
        }
        var current = RequirePlatform();
        var target = await store.Select<User>().Where(x => x.Id == id && !x.IsDeleted && x.SecurityReady).ForUpdate().FirstAsync()
            ?? throw new AccessException("管理员不存在", 404);
        if (current.TenantId == null ? !target.IsAdmin || target.TenantId != null
            : target.TenantId != current.TenantId || !await guard.IsTenantAdministratorAsync(id))
            throw new AccessException("管理员不属于当前管理范围", 404);
        return target;
    }

    async Task EnsureAdministratorRemainsAsync(User target)
    {
        if (!target.IsActived) return;
        if (target.IsAdmin)
        {
            var remaining = await store.Select<User>().Where(x => !x.IsDeleted && x.SecurityReady && x.IsActived
                && x.IsAdmin && x.TenantId == null && x.Id != target.Id).ForUpdate().CountAsync();
            if (remaining == 0) throw new AccessException("必须保留至少一位有效平台管理员", 409);
        }
        else if (await guard.IsTenantAdministratorAsync(target.Id))
        {
            var backend = access.Require().BackendAppId;
            var roles = await store.Select<CrudRole>().Where(x => !x.IsDeleted && x.TenantId == target.TenantId
                && x.AppsId == backend && x.RoleKind == ResourceSecurityCatalog.TenantAdministrator).ToListAsync(x => x.Id);
            var users = await store.Select<CrudRoleUser>().Where(x => !x.IsDeleted && x.TenantId == target.TenantId
                && x.AppsId == backend && roles.Contains(x.RoleId)).ToListAsync(x => x.UserId);
            if (!await store.Select<User>().Where(x => users.Contains(x.Id) && x.Id != target.Id && !x.IsDeleted
                && x.IsActived && x.SecurityReady && x.TenantId == target.TenantId).ForUpdate().AnyAsync())
                throw new AccessException("必须保留至少一位有效租户管理员", 409);
        }
    }

    Task<int> RevokeAsync(long userId) => store.Update<LoginSession>().Where(x => x.UserId == userId && x.RevokedAt == null)
        .Set(x => x.RevokedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
    AccessSnapshot RequirePlatform()
    {
        var current = access.Require();
        if (!current.IsPlatformAdmin || current.MustChangePassword) throw new AccessException("仅平台管理员可执行该操作");
        return current;
    }
}
