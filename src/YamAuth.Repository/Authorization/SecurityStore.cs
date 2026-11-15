using System.Data;
using System.Data.Common;
using System.Text.Json;
using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Authorization;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.Authorization;

/// <summary>显式共享一个物理库事务，不依赖两个 FreeSql 单例的隐式事务或共享请求状态。</summary>
public sealed class SecurityStore([FromKeyedServices(DbKeys.Base)] IFreeSql db, AccessContext access)
{
    public IFreeSql Db { get; } = db;
    public DbTransaction? Transaction { get; private set; }
    public ISelect<T> Select<T>() where T : class => Db.Select<T>().WithTransaction(Transaction);
    public IUpdate<T> Update<T>() where T : class => Db.Update<T>().WithTransaction(Transaction);
    public IDelete<T> Delete<T>() where T : class => Db.Delete<T>().WithTransaction(Transaction);
    public IInsert<T> Insert<T>(T entity) where T : class => Db.Insert(entity).WithTransaction(Transaction);

    public async Task<T> WriteAsync<T>(Func<Task<T>> action)
    {
        if (Transaction != null) return await action();
        using var unit = Db.CreateUnitOfWork();
        unit.IsolationLevel = IsolationLevel.Serializable;
        Transaction = unit.GetOrBeginTransaction();
        try
        {
            var result = await action();
            unit.Commit();
            return result;
        }
        finally { Transaction = null; }
    }

    public Task WriteAsync(Func<Task> action) => WriteAsync(async () => { await action(); return true; });

    public Task<int> BumpTenantAsync(long tenantId) => Update<Tenant>().Where(x => x.Id == tenantId && !x.IsDeleted)
        .Set(x => x.AuthorizationVersion + 1).ExecuteAffrowsAsync();

    public Task<int> BumpCatalogAsync(long appId) => Update<AppsInfo>().Where(x => x.Id == appId && !x.IsDeleted)
        .Set(x => x.CatalogVersion + 1).ExecuteAffrowsAsync();

    public async Task AuditAsync(string action, string targetType, object? targetId, string result = "Allowed",
        object? summary = null, long? tenantId = null, long? actorUserId = null, Guid? actorSessionId = null)
    {
        var snapshot = access.Snapshot;
        var entry = new AuditEvent
        {
            Id = Guid.NewGuid(), UserId = actorUserId ?? snapshot?.UserId, SessionId = actorSessionId ?? snapshot?.SessionId,
            TenantId = tenantId ?? snapshot?.TenantId, AppsId = snapshot?.BackendAppId, ContextId = snapshot?.ContextId,
            Action = action, TargetType = targetType, TargetId = targetId?.ToString(), Result = result,
            CreatedAt = DateTime.UtcNow, TraceId = access.TraceId,
            // 调用点仅传白名单摘要，不接受完整请求、实体或异常对象。
            Summary = JsonSerializer.Serialize(summary ?? new { })
        };
        await Insert(new AuditOutbox
        {
            Id = entry.Id, CreatedAt = entry.CreatedAt, Payload = JsonSerializer.Serialize(entry)
        }).ExecuteAffrowsAsync();
    }

    public static string NormalizeIdentifier(string value) => value.Trim().ToUpperInvariant();

    public async Task SaveIdentifiersAsync(User user)
    {
        var username = NormalizeIdentifier(user.UserName);
        var email = NormalizeIdentifier(user.Email);
        if (username.Length == 0 || email.Length == 0) throw new AccessException("用户名和邮箱不能为空", 400);
        var keys = new[] { username, email }.Distinct().ToArray();
        if (await Select<LoginIdentifier>().Where(x => keys.Contains(x.NormalizedValue) && x.UserId != user.Id).AnyAsync())
            throw new AccessException("用户名或邮箱已被其他账号使用", 409);
        await Delete<LoginIdentifier>().Where(x => x.UserId == user.Id).ExecuteAffrowsAsync();
        foreach (var key in keys)
            await Insert(new LoginIdentifier
            {
                NormalizedValue = key, UserId = user.Id, IsUserName = key == username, IsEmail = key == email
            }).ExecuteAffrowsAsync();
    }
}
