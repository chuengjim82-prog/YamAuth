using FreeSql;
using YamAuth.Authorization;
using YamAuth.Entity.Abstractions;
using YamAuth.Repository.Authorization;

namespace YamAuth.Repository.Abstractions;

public abstract class RepositoryBase<TEntity> where TEntity : class, IAuditEntity, new()
{
    protected readonly IFreeSql Fsql;
    protected readonly ICurrentUser Current;
    protected readonly DataAccessGuard Guard;
    protected readonly SecurityStore Store;

    protected RepositoryBase(IFreeSql fsql, ICurrentUser current, DataAccessGuard guard, SecurityStore store)
        => (Fsql, Current, Guard, Store) = (fsql, current, guard, store);

    protected ISelect<TEntity> Select => Guard.Select<TEntity>(Fsql);

    protected async Task<TEntity?> GetByIdAsync(long id)
    {
        var entity = await Select.Where(x => x.Id == id).FirstAsync()
            ?? throw new AccessException("记录不存在或不在允许访问的范围内", 404);
        await Guard.DecorateAsync(Fsql, new[] { entity });
        return entity;
    }

    protected Task<long> InsertEntityAsync(TEntity entity) => Store.WriteAsync(async () =>
    {
        await Guard.PrepareCreateAsync(entity);
        entity.CreatorId = Current.UserId; entity.CreatorNic = Current.UserNic;
        entity.CreateTime = DateTime.UtcNow; entity.IsDeleted = false;
        entity.Id = await Fsql.Insert(entity).WithTransaction(Store.Transaction).ExecuteIdentityAsync();
        await Guard.AfterWriteAsync(entity, "create");
        return entity.Id;
    });

    protected Task InsertEntitiesAsync(IEnumerable<TEntity> entities) => Store.WriteAsync(async () =>
    {
        foreach (var entity in entities) await InsertEntityAsync(entity);
    });

    protected Task<int> UpdateEntityAsync(TEntity entity) => Store.WriteAsync(async () =>
    {
        var original = await Select.Where(x => x.Id == entity.Id).FirstAsync()
            ?? throw new AccessException("记录不存在或不可修改", 404);
        await Guard.ValidateUpdateAsync(original, entity);
        entity.UpdaterId = Current.UserId; entity.UpdaterNic = Current.UserNic; entity.UpdateTime = DateTime.UtcNow;
        var rule = ResourceSecurityCatalog.Entity(typeof(TEntity).Name);
        var update = Fsql.Update<TEntity>().WithTransaction(Store.Transaction).SetSource(entity)
            .Where(Guard.Predicate(rule, rule.Key + ".update"));
        ApplyVersion(update, original);
        var affected = await update.ExecuteAffrowsAsync();
        if (affected != 1) throw new AccessException("记录已变化，请重新读取", 409);
        await Guard.AfterWriteAsync(entity, "update");
        return affected;
    });

    protected Task<int> SoftDeleteByIdAsync(long id) => Store.WriteAsync(async () =>
    {
        var original = await Select.Where(x => x.Id == id).FirstAsync()
            ?? throw new AccessException("记录不存在或不可删除", 404);
        await Guard.ValidateDeleteAsync(original);
        var rule = ResourceSecurityCatalog.Entity(typeof(TEntity).Name);
        var update = Fsql.Update<TEntity>().WithTransaction(Store.Transaction).Where(x => x.Id == id)
            .Where(Guard.Predicate(rule, rule.Key + ".delete"))
            .Set(x => x.IsDeleted, true).Set(x => x.DeleterId, Current.UserId)
            .Set(x => x.DeleterNic, Current.UserNic).Set(x => x.DeleteTime, DateTime.UtcNow);
        ApplyVersion(update, original);
        var affected = await update.ExecuteAffrowsAsync();
        if (affected != 1) throw new AccessException("记录已变化，请重新读取", 409);
        await Guard.AfterWriteAsync(original, "delete");
        return affected;
    });

    void ApplyVersion(IUpdate<TEntity> update, TEntity original)
    {
        var property = typeof(TEntity).GetProperty("RowVersion");
        if (property == null) return;
        var expected = Guard.Access.ExpectedVersion ?? throw new AccessException("请携带 If-Match 并发版本", 400);
        var actual = (byte[])property.GetValue(original)!;
        if (!actual.SequenceEqual(expected)) throw new AccessException("记录已被修改，请重新读取", 409);
        update.Where("[RowVersion] = @expectedVersion", new { expectedVersion = expected });
    }
}
