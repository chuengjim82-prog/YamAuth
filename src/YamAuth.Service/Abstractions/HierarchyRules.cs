namespace YamAuth.Service.Abstractions;

public sealed record HierarchyNode(long Id, long ParentId, long? AppsId);

/// <summary>在事务快照上校验父链；不修改历史异常记录。</summary>
public static class HierarchyRules
{
    public static void ValidateDelete(IEnumerable<HierarchyNode> nodes, long id)
    {
        if (nodes.Any(x => x.ParentId == id))
            throw new BusinessException("存在子节点，请先移动或删除子节点");
    }

    public static void ValidateAppChange(IEnumerable<HierarchyNode> nodes, long id, long? oldApp, long? newApp)
    {
        if (oldApp != newApp && nodes.Any(x => x.ParentId == id))
            throw new BusinessException("存在子功能，请先调整子功能后再修改所属应用");
    }

    public static void ValidateParent(IEnumerable<HierarchyNode> nodes, long id, long parentId, long? appsId, bool appScoped)
    {
        var byId = nodes.ToDictionary(x => x.Id);
        var visited = new HashSet<long>();
        while (parentId != 0)
        {
            if (parentId < 0) throw new BusinessException("上级编号不能为负数");
            if (parentId == id) throw new BusinessException("不能选择自己或自己的后代作为上级");
            if (!visited.Add(parentId)) throw new BusinessException("所选上级的祖先链存在循环，请先修复");
            if (!byId.TryGetValue(parentId, out var parent))
                throw new BusinessException("所选上级或其祖先不存在或已删除");
            if (appScoped && parent.AppsId != appsId)
                throw new BusinessException("功能与上级必须属于同一应用");
            parentId = parent.ParentId;
        }
    }
}
