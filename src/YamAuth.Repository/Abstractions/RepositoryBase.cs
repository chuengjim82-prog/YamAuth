using FreeSql;
using YamAuth.Entity.Abstractions;

namespace YamAuth.Repository.Abstractions;

public abstract class RepositoryBase<TEntity> where TEntity : class, IAuditEntity, new()
{
    protected readonly IFreeSql Fsql;
    protected readonly ICurrentUser Current;

    protected RepositoryBase(IFreeSql fsql, ICurrentUser current)
    {
        Fsql = fsql;
        Current = current;
    }

    protected IBaseRepository<TEntity> Repo => Fsql.GetRepository<TEntity>();

    protected Task<TEntity?> GetByIdAsync(long id)
        => Repo.Select.Where(x => x.Id == id && !x.IsDeleted).FirstAsync()!;

    protected async Task<long> InsertEntityAsync(TEntity entity)
    {
        FillAuditOnInsert(entity);
        var inserted = await Repo.InsertAsync(entity);
        return inserted.Id;
    }

    protected async Task InsertEntitiesAsync(IEnumerable<TEntity> entities)
    {
        var list = entities.ToList();
        foreach (var e in list) FillAuditOnInsert(e);
        await Repo.InsertAsync(list);
    }

    protected async Task<int> UpdateEntityAsync(TEntity entity)
    {
        FillAuditOnUpdate(entity);
        return await Repo.UpdateAsync(entity);
    }

    protected async Task<int> SoftDeleteByIdAsync(long id)
    {
        var e = await GetByIdAsync(id);
        if (e == null) return 0;
        e.IsDeleted = true;
        e.DeleterId = Current.UserId;
        e.DeleterNic = Current.UserNic;
        e.DeleteTime = DateTime.UtcNow;
        return await Repo.UpdateAsync(e);
    }

    void FillAuditOnInsert(TEntity e)
    {
        e.CreatorId = Current.UserId;
        e.CreatorNic = Current.UserNic;
        e.CreateTime = DateTime.UtcNow;
        e.IsDeleted = false;
    }

    void FillAuditOnUpdate(TEntity e)
    {
        e.UpdaterId = Current.UserId;
        e.UpdaterNic = Current.UserNic;
        e.UpdateTime = DateTime.UtcNow;
    }
}
