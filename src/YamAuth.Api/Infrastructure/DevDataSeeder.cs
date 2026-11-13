using FreeSql;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;
using YamAuth.Service.Abstractions;

namespace YamAuth.Api.Infrastructure;

/// <summary>
/// 开发库为空时写入管理员和侧边栏菜单。菜单路径与 CodeGen 的 CRUD 路由一致。
/// </summary>
public static class DevDataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var fsql = services.GetRequiredKeyedService<IFreeSql>(DbKeys.Base);

        if (!await fsql.Select<User>().AnyAsync())
        {
            var (hash, salt) = PasswordHelper.Hash("Admin@123");
            await fsql.Insert(new User
            {
                UserName = "admin",
                NickName = "管理员",
                Password = hash,
                PwdSalt = salt,
                Avatar = "",
                Phone = "",
                Email = "admin@yamauth.local",
                IsAdmin = true,
                IsActived = true,
                IsDeleted = false,
                CreatorId = 0,
                CreatorNic = "seed",
                CreateTime = DateTime.Now
            }).ExecuteAffrowsAsync();
        }

        if (!await fsql.Select<CrudMenu>().AnyAsync())
            await SeedMenusAsync(fsql);
    }

    static async Task SeedMenusAsync(IFreeSql fsql)
    {
        var authId = await AddAsync(fsql, 0, "auth", "权限", CrudMenuType.Directory, "Lock", null, 10);
        var bzssId = await AddAsync(fsql, 0, "bzss", "业务", CrudMenuType.Directory, "Briefcase", null, 20);
        var unitId = await AddAsync(fsql, 0, "unit", "组织", CrudMenuType.Directory, "OfficeBuilding", null, 30);

        var auth = new (string Code, string Name, string Icon, string Path)[]
        {
            ("auth.users", "用户", "User", "/auth/users"),
            ("auth.tenants", "租户", "OfficeBuilding", "/auth/tenants"),
            ("auth.apps-infos", "应用", "Grid", "/auth/apps-infos"),
            ("auth.apps-users", "应用用户", "Connection", "/auth/apps-users"),
            ("auth.crud-infos", "功能", "List", "/auth/crud-infos"),
            ("auth.crud-items", "功能接口", "Tickets", "/auth/crud-items"),
            ("auth.crud-menus", "菜单", "Menu", "/auth/crud-menus"),
            ("auth.crud-roles", "功能角色", "Key", "/auth/crud-roles"),
            ("auth.crud-role-cruds", "角色功能", "Share", "/auth/crud-role-cruds"),
            ("auth.crud-role-users", "角色用户", "UserFilled", "/auth/crud-role-users"),
            ("auth.data-roles", "数据角色", "Coin", "/auth/data-roles"),
            ("auth.data-role-users", "数据角色用户", "Avatar", "/auth/data-role-users"),
        };
        for (var i = 0; i < auth.Length; i++)
            await AddAsync(fsql, authId, auth[i].Code, auth[i].Name, CrudMenuType.Menu, auth[i].Icon, auth[i].Path, (i + 1) * 10);

        await AddAsync(fsql, bzssId, "bzss.companies", "公司", CrudMenuType.Menu, "Suitcase", "/bzss/companies", 10);
        await AddAsync(fsql, bzssId, "bzss.projects", "项目", CrudMenuType.Menu, "Folder", "/bzss/projects", 20);
        await AddAsync(fsql, unitId, "unit.departments", "部门", CrudMenuType.Menu, "School", "/unit/departments", 10);
        await AddAsync(fsql, unitId, "unit.employees", "员工", CrudMenuType.Menu, "Postcard", "/unit/employees", 20);
    }

    static async Task<long> AddAsync(
        IFreeSql fsql, long parentId, string code, string name, CrudMenuType type, string icon, string? route, int sort)
    {
        var id = await fsql.Insert(new CrudMenu
        {
            ParentId = parentId,
            MenuCode = code,
            MenuName = name,
            MenuType = type.ToCode(),
            IconName = icon,
            RoutePath = route,
            SortIndex = sort,
            IsHided = false,
            AllowAny = true,
            IsDeleted = false,
            CreatorId = 0,
            CreatorNic = "seed",
            CreateTime = DateTime.Now
        }).ExecuteIdentityAsync();
        return id;
    }
}
