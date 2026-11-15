using System.Text.Json;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Authorization;

namespace YamAuth.Api.Authorization;

public sealed class AuditWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<AuditWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                var store = scope.ServiceProvider.GetRequiredService<SecurityStore>();
                await DispatchAsync(store);
                var days = config.GetValue<int?>("Authorization:AuditRetentionDays") ?? 180;
                if (days <= 0) throw new InvalidOperationException("审计保留天数必须为正数");
                var cutoff = DateTime.UtcNow.AddDays(-days);
                await store.Delete<AuditEvent>().Where(x => x.CreatedAt < cutoff).ExecuteAffrowsAsync();
                await store.Delete<AuditOutbox>().Where(x => x.DispatchedAt != null && x.CreatedAt < cutoff).ExecuteAffrowsAsync();
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "审计汇总失败，持久化事件保留并等待重试"); }
        }
    }

    public static Task DispatchAsync(SecurityStore store) => store.WriteAsync(async () =>
    {
        var events = await store.Select<AuditOutbox>().Where(x => x.DispatchedAt == null).OrderBy(x => x.CreatedAt).Limit(100).ForUpdate().ToListAsync();
        foreach (var pending in events)
        {
            var entry = JsonSerializer.Deserialize<AuditEvent>(pending.Payload) ?? throw new InvalidOperationException("审计事件格式错误");
            if (!await store.Select<AuditEvent>().Where(x => x.Id == entry.Id).AnyAsync()) await store.Insert(entry).ExecuteAffrowsAsync();
            await store.Update<AuditOutbox>().Where(x => x.Id == pending.Id).Set(x => x.DispatchedAt, DateTime.UtcNow).ExecuteAffrowsAsync();
        }
    });
}
