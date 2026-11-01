using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public interface IMenuTreeService : IService
{
    Task<List<MenuTreeDto>> GetMenuTreeAsync();
}
