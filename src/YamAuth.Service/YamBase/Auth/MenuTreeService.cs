using YamAuth.Dtos.Auth;
using YamAuth.Service.Authorization;

namespace YamAuth.Service.YamBase.Auth;

public class MenuTreeService(AccessService access) : IMenuTreeService
{
    public Task<List<MenuTreeDto>> GetMenuTreeAsync() => access.MenusAsync();
}
