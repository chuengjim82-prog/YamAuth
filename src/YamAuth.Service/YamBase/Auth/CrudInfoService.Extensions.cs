using Mapster;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Service.Abstractions;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudInfoService
{
    public Task<long> CreateAsync(CrudInfoCreateDto dto)
        => _repo.WithHierarchyAsync(async session =>
        {
            HierarchyRules.ValidateParent(session.Items.Select(x => new HierarchyNode(x.Id, x.ParentId, x.AppsId)),
                0, dto.ParentId, dto.AppsId, true);
            return await session.InsertAsync(dto.Adapt<CrudInfo>());
        });

    public Task UpdateAsync(long id, CrudInfoUpdateDto dto)
        => _repo.WithHierarchyAsync(async session =>
        {
            var current = session.Items.FirstOrDefault(x => x.Id == id)
                ?? throw new BusinessException("记录不存在", 404);
            HierarchyRules.ValidateAppChange(session.Items.Select(x => new HierarchyNode(x.Id, x.ParentId, x.AppsId)), id, current.AppsId, dto.AppsId);
            HierarchyRules.ValidateParent(session.Items.Select(x => new HierarchyNode(x.Id, x.ParentId, x.AppsId)),
                id, dto.ParentId, dto.AppsId, true);
            dto.Adapt(current);
            current.Id = id;
            return await session.UpdateAsync(current);
        });

    public Task DeleteAsync(long id)
        => _repo.WithHierarchyAsync(async session =>
        {
            HierarchyRules.ValidateDelete(session.Items.Select(x => new HierarchyNode(x.Id, x.ParentId, null)), id);
            var current = session.Items.FirstOrDefault(x => x.Id == id);
            return current == null ? 0 : await session.DeleteAsync(current);
        });
}
