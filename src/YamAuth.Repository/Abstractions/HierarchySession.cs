using System.Data;
using System.Data.Common;
using FreeSql;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Repository.Abstractions;

/// <summary>仅供菜单和功能的层级写操作使用，校验快照与写入共享同一数据库事务。</summary>
public sealed class HierarchySession<TEntity> where TEntity : class, IAuditEntity, new()
{
    private readonly IFreeSql _orm;
    private readonly DbTransaction _transaction;
    private readonly ICurrentUser _current;
    public IReadOnlyList<TEntity> Items { get; }

    private HierarchySession(IFreeSql orm, DbTransaction transaction, ICurrentUser current, List<TEntity> items)
        => (_orm, _transaction, _current, Items) = (orm, transaction, current, items);

    public static async Task<T> RunAsync<T>(IFreeSql orm, ICurrentUser current, Func<HierarchySession<TEntity>, Task<T>> action)
    {
        using var unit = orm.CreateUnitOfWork();
        unit.IsolationLevel = IsolationLevel.Serializable;
        var transaction = unit.GetOrBeginTransaction();
        // Serializable 的范围锁覆盖空结果和新插入；更新锁避免两个写请求同时持有共享快照。
        var items = await orm.Select<TEntity>().WithTransaction(transaction)
            .Where(x => !x.IsDeleted).OrderBy(x => x.Id).ForUpdate().ToListAsync();
        var result = await action(new HierarchySession<TEntity>(orm, transaction, current, items));
        unit.Commit();
        return result;
    }

    public async Task<long> InsertAsync(TEntity entity)
    {
        entity.CreatorId = _current.UserId;
        entity.CreatorNic = _current.UserNic;
        entity.CreateTime = DateTime.UtcNow;
        entity.IsDeleted = false;
        return await _orm.Insert(entity).WithTransaction(_transaction).ExecuteIdentityAsync();
    }

    public Task<int> UpdateAsync(TEntity entity)
    {
        entity.UpdaterId = _current.UserId;
        entity.UpdaterNic = _current.UserNic;
        entity.UpdateTime = DateTime.UtcNow;
        return SaveAsync(entity);
    }

    public Task<int> DeleteAsync(TEntity entity)
    {
        entity.IsDeleted = true;
        entity.DeleterId = _current.UserId;
        entity.DeleterNic = _current.UserNic;
        entity.DeleteTime = DateTime.UtcNow;
        return SaveAsync(entity);
    }

    private Task<int> SaveAsync(TEntity entity)
        => _orm.Update<TEntity>().WithTransaction(_transaction).SetSource(entity).ExecuteAffrowsAsync();
}
