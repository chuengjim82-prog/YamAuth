using YamAuth.Repository.YamBase.Auth;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public class MenuTreeService : IMenuTreeService
{
    private readonly ICrudMenuRepository _menuRepo;

    public MenuTreeService(ICrudMenuRepository menuRepo) => _menuRepo = menuRepo;

    public async Task<List<MenuTreeDto>> GetMenuTreeAsync()
    {
        var all = await _menuRepo.ListAllAsync();
        var nodes = all
            .Where(m => !m.IsHided)
            .OrderBy(m => m.SortIndex)
            .Select(m => new MenuTreeDto
            {
                Id = m.Id,
                ParentId = m.ParentId,
                MenuName = m.MenuName ?? "",
                MenuUrl = m.RoutePath ?? "",
                MenuIcon = m.IconName ?? ""
            })
            .ToList();

        var ids = nodes.Select(n => n.Id).ToHashSet();
        var byParent = nodes.ToLookup(n => n.ParentId);
        foreach (var n in nodes)
            n.Children = byParent[n.Id].ToList();

        return nodes.Where(n => n.ParentId == 0 || !ids.Contains(n.ParentId)).ToList();
    }
}
