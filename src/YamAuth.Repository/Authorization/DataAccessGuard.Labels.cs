using YamAuth.Authorization;
using YamAuth.Entity.Abstractions;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Entity.YamBase.Unit;

namespace YamAuth.Repository.Authorization;

public sealed partial class DataAccessGuard
{
    async Task FillLabelsAsync<T>(IReadOnlyList<T> items) where T : class, IAuditEntity, new()
    {
        var current = Access.Require();
        long? Id(T item, string name) => typeof(T).GetProperty(name)?.GetValue(item) is long id ? id : null;
        long[] Ids(params string[] names) => items.SelectMany(item => names.Select(name => Id(item, name))).Where(x => x is > 0).Select(x => x!.Value).Distinct().ToArray();
        var userIds = Ids("UserId", "OwnerUserId");
        var departmentIds = Ids("DepartmentId", "OwnerDepartmentId");
        var appIds = Ids("AppsId");
        var roleIds = Ids("RoleId", "CrudRoleId");
        var infoIds = Ids("CrudId", "CrudInfoId");
        var users = userIds.Length == 0 ? new List<User>() : await Store.Select<User>().Where(x => userIds.Contains(x.Id) && !x.IsDeleted && x.SecurityReady && x.TenantId == current.TenantId).ToListAsync();
        var departments = departmentIds.Length == 0 ? new List<Department>() : await Store.Select<Department>().Where(x => departmentIds.Contains(x.Id) && !x.IsDeleted && x.TenantId == current.TenantId).ToListAsync();
        var apps = appIds.Length == 0 ? new List<AppsInfo>() : await Store.Select<AppsInfo>().Where(x => appIds.Contains(x.Id) && !x.IsDeleted
            && (x.Id == current.BackendAppId || x.TenantId == current.TenantId && x.AppKind == ResourceSecurityCatalog.TenantAppKind)).ToListAsync();
        var roles = roleIds.Length == 0 ? new List<CrudRole>() : await Store.Select<CrudRole>().Where(x => roleIds.Contains(x.Id) && !x.IsDeleted && x.TenantId == current.TenantId).ToListAsync();
        var dataRoles = roleIds.Length == 0 ? new List<DataRole>() : await Store.Select<DataRole>().Where(x => roleIds.Contains(x.Id) && !x.IsDeleted && x.TenantId == current.TenantId).ToListAsync();
        var infos = infoIds.Length == 0 ? new List<CrudInfo>() : await Store.Select<CrudInfo>().Where(x => infoIds.Contains(x.Id) && !x.IsDeleted)
            .Where($"([AppsId] = {current.BackendAppId} OR [AppsId] IN ({AppIds(current)}))").ToListAsync();
        var property = typeof(T).GetProperty("RelatedLabels")!;
        foreach (var item in items)
        {
            string? UserLabel(long? id) => users.FirstOrDefault(x => x.Id == id) is User user ? user.NickName + " / " + user.UserName : null;
            var roleId = Id(item, "RoleId") ?? Id(item, "CrudRoleId");
            property.SetValue(item, new RelationLabels
            {
                Tenant = Id(item, "TenantId") == current.TenantId ? current.TenantName : null,
                User = UserLabel(Id(item, "UserId")), OwnerUser = UserLabel(Id(item, "OwnerUserId")),
                Department = departments.FirstOrDefault(x => x.Id == Id(item, "DepartmentId"))?.DeptName,
                OwnerDepartment = departments.FirstOrDefault(x => x.Id == Id(item, "OwnerDepartmentId"))?.DeptName,
                App = apps.FirstOrDefault(x => x.Id == Id(item, "AppsId"))?.AppsName,
                CrudRole = roles.FirstOrDefault(x => x.Id == roleId)?.RoleName,
                DataRole = dataRoles.FirstOrDefault(x => x.Id == roleId)?.RoleName,
                CrudInfo = infos.FirstOrDefault(x => x.Id == (Id(item, "CrudId") ?? Id(item, "CrudInfoId")))?.CrudName
            });
        }
    }
}
