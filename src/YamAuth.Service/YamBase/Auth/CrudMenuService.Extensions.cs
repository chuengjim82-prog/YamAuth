using Mapster;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Service.Abstractions;

namespace YamAuth.Service.YamBase.Auth;

public partial class CrudMenuService
{
    public Task<long> CreateAsync(CrudMenuCreateDto dto)
        => _repo.WithHierarchyAsync(async session =>
        {
            HierarchyRules.ValidateParent(session.Items.Select(x => new HierarchyNode(x.Id, x.ParentId, null)),
                0, dto.ParentId, null, false);
            return await session.InsertAsync(dto.Adapt<CrudMenu>());
        });

    public Task UpdateAsync(long id, CrudMenuUpdateDto dto)
        => _repo.WithHierarchyAsync(async session =>
        {
            var current = session.Items.FirstOrDefault(x => x.Id == id)
                ?? throw new BusinessException("记录不存在", 404);
            HierarchyRules.ValidateParent(session.Items.Select(x => new HierarchyNode(x.Id, x.ParentId, null)),
                id, dto.ParentId, null, false);
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
