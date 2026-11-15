using YamAuth.Authorization;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.Abstractions;
using YamAuth.Entity.YamBase.Unit;
using YamAuth.Entity.YamBzss.Bzss;
using YamAuth.Repository.Authorization;

namespace YamAuth.Service.Authorization;

public sealed class OwnershipService(SecurityStore store, AccessContext access, DataAccessGuard guard)
{
    public Task AssignEmployeeAsync(long id, EmployeeAssignmentDto dto) => store.WriteAsync(async () =>
    {
        access.Demand("unit.employees.assignment");
        var employee = await guard.Select<Employee>(store.Db, "unit.employees.assignment").Where(x => x.Id == id).ForUpdate().FirstAsync()
            ?? throw new AccessException("员工不存在", 404);
        var current = access.Require();
        if (!current.IsPlatformAdmin)
        {
            foreach (var userId in new[] { employee.UserId, dto.UserId }.Where(x => x != null && x != current.UserId).Distinct())
                if (await guard.IsTenantAdministratorAsync(userId!.Value)) throw new AccessException("其他管理员的组织关系须由平台维护");
        }
        if (dto.UserId is long user)
        {
            await guard.RequireUserAsync(user);
            if (await store.Select<Employee>().Where(x => !x.IsDeleted && x.OwnershipConfirmed && x.Id != id && x.UserId == user).AnyAsync())
                throw new AccessException("账号已绑定有效员工记录", 409);
        }
        if (dto.DepartmentId is long department) await guard.RequireDepartmentAsync(department);
        await store.Update<Employee>().Where(x => x.Id == id).Where(guard.Predicate(ResourceSecurityCatalog.Entity("Employee"), "unit.employees.assignment"))
            .Set(x => x.UserId, dto.UserId).Set(x => x.DepartmentId, dto.DepartmentId).Set(x => x.OwnershipConfirmed, true)
            .Set(x => x.UpdaterId, current.UserId).Set(x => x.UpdateTime, DateTime.UtcNow).ExecuteAffrowsAsync();
        await store.BumpTenantAsync(current.TenantId!.Value);
        await store.AuditAsync("unit.employees.assignment", "Employee", id,
            summary: new { previousUserId = employee.UserId, previousDepartmentId = employee.DepartmentId, dto.UserId, dto.DepartmentId });
    });

    public Task TransferCompanyAsync(long id, OwnershipTransferDto dto) => TransferAsync<Company>(id, dto);
    public Task TransferProjectAsync(long id, OwnershipTransferDto dto) => TransferAsync<Project>(id, dto);

    Task TransferAsync<T>(long id, OwnershipTransferDto dto) where T : class, IAuditEntity, new() => store.WriteAsync(async () =>
    {
        var rule = ResourceSecurityCatalog.Entity(typeof(T).Name);
        var permission = rule.Key + ".transfer";
        access.Demand(permission);
        var record = await guard.Select<T>(store.Db, permission).Where(x => x.Id == id).ForUpdate().FirstAsync()
            ?? throw new AccessException("记录不存在或不可转移", 404);
        await guard.ValidateOwnerAsync(permission, dto.OwnerUserId, dto.OwnerDepartmentId);
        var expected = access.ExpectedVersion ?? throw new AccessException("请携带 If-Match 并发版本", 400);
        var actual = (byte[])typeof(T).GetProperty("RowVersion")!.GetValue(record)!;
        if (!actual.SequenceEqual(expected)) throw new AccessException("记录已被修改，请重新读取", 409);
        var affected = await store.Update<T>().Where(x => x.Id == id).Where(guard.Predicate(rule, permission))
            .Where("[RowVersion] = @expected", new { expected })
            .SetDto(new { dto.OwnerUserId, dto.OwnerDepartmentId, OwnershipConfirmed = true,
                UpdaterId = access.Require().UserId, UpdateTime = DateTime.UtcNow }).ExecuteAffrowsAsync();
        if (affected != 1) throw new AccessException("记录已变化，请重新读取", 409);
        await store.AuditAsync(permission, rule.Entity, id, summary: new { dto.OwnerUserId, dto.OwnerDepartmentId });
    });
}
