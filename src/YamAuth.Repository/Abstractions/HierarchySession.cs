using YamAuth.Authorization;
using YamAuth.Entity.Abstractions;
using YamAuth.Repository.Authorization;

namespace YamAuth.Repository.Abstractions;

/// <summary>层级检查与受约束写入共用事务；快照只包含当前租户和应用允许管理的节点。</summary>
public sealed class HierarchySession<TEntity> where TEntity : class, IAuditEntity, new()
{
    readonly Func<TEntity, Task<long>> _insert;
    readonly Func<TEntity, Task<int>> _update;
    readonly Func<long, Task<int>> _delete;
    public IReadOnlyList<TEntity> Items { get; }
    HierarchySession(List<TEntity> items, Func<TEntity, Task<long>> insert, Func<TEntity, Task<int>> update, Func<long, Task<int>> delete)
        => (Items, _insert, _update, _delete) = (items, insert, update, delete);

    public static Task<T> RunAsync<T>(IFreeSql orm, DataAccessGuard guard, SecurityStore store,
        Func<TEntity, Task<long>> insert, Func<TEntity, Task<int>> update, Func<long, Task<int>> delete,
        Func<HierarchySession<TEntity>, Task<T>> action) => store.WriteAsync(async () =>
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(TEntity).Name);
        var items = await guard.Select<TEntity>(orm, rule.Key + ".read").OrderBy(x => x.Id).ForUpdate().ToListAsync();
        return await action(new(items, insert, update, delete));
    });

    public Task<long> InsertAsync(TEntity entity) => _insert(entity);
    public Task<int> UpdateAsync(TEntity entity) => _update(entity);
    public Task<int> DeleteAsync(TEntity entity) => _delete(entity.Id);
}
