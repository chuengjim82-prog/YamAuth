using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Api.Authorization;
using YamAuth.Authorization;
using YamAuth.CodeGen.Generators;
using YamAuth.CodeGen.Schema;
using YamAuth.Dtos.Auth;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Authorization;
using Xunit;

namespace YamAuth.Tests;

public sealed class AuthorizationTests
{
    public static AccessSnapshot Member(params OperationGrant[] grants) => new(11, "member", "成员", Guid.NewGuid(), 1,
        false, false, false, 1, 1, "租户一", 10, 100, 1, 1, null, grants);
    [Fact]
    public void ScopesOnlyUnionTheSameOperation()
    {
        var current = Member(new("bzss.projects.read", DataScopeType.TenantAll, []), new("bzss.projects.update", DataScopeType.Self, []),
            new("bzss.projects.update", DataScopeType.CustomDepartments, [20, 30]), new("bzss.projects.update", DataScopeType.Department, []));
        var scope = current.Scope("bzss.projects.update");
        Assert.True(scope.Self); Assert.False(scope.TenantAll); Assert.Equal(new long[] { 10, 20, 30 }, scope.DepartmentIds.Order());
        Assert.True(current.Scope("bzss.projects.delete").IsEmpty);
    }
    [Fact]
    public void DepartmentWithoutBindingGrantsNoRows()
    {
        var current = Member(new OperationGrant("bzss.projects.read", DataScopeType.Department, [])) with { DepartmentId = null };
        Assert.False(current.Can("bzss.projects.read"));
    }
    [Fact]
    public void UnknownAndPrivilegedOperationsCannotBeGranted()
    {
        Assert.Throws<AccessException>(() => ResourceSecurityCatalog.ValidateGrant("auth.users.create", DataScopeType.Self, []));
        Assert.Throws<AccessException>(() => ResourceSecurityCatalog.ValidateGrant("unit.employees.assignment", DataScopeType.TenantAll, []));
        Assert.Throws<AccessException>(() => ResourceSecurityCatalog.ValidateGrant("unknown.read", DataScopeType.TenantAll, []));
        Assert.Throws<AccessException>(() => ResourceSecurityCatalog.ValidateGrant("bzss.projects.read", DataScopeType.CustomDepartments, []));
        Assert.Throws<AccessException>(() => ResourceSecurityCatalog.ValidateGrant("bzss.projects.read", DataScopeType.CustomDepartments, [2, 2]));
    }
    [Fact]
    public void PlatformRequiresTenantContextForBusinessAndCannotBypassForcedPassword()
    {
        var platform = Member() with { IsPlatformAdmin = true, AccountTenantId = null, TenantId = null };
        Assert.True(platform.Can("auth.tenants.read")); Assert.False(platform.Can("bzss.projects.read"));
        Assert.True((platform with { TenantId = 2, ContextId = Guid.NewGuid() }).Can("bzss.projects.read"));
        Assert.Throws<AccessException>(() => AccessPolicyHandler.Ensure(platform with { MustChangePassword = true }, "platform"));
        AccessPolicyHandler.Ensure(platform with { MustChangePassword = true }, "self:password");
    }
    [Fact]
    public void EveryBusinessEndpointHasOneDeclaredKnownPolicy()
    {
        var services = new ServiceCollection(); services.AddLogging(); services.AddControllers().AddApplicationPart(typeof(YamAuth.Api.Controllers.V1.Auth.AccessController).Assembly);
        using var provider = services.BuildServiceProvider(); EndpointSecurityCheck.Validate(provider);
        Assert.True(provider.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors.Items.Count > 80);
    }
    [Fact]
    public void MissingPolicyAndAnonymousBusinessActionFailCoverage()
    {
        foreach (var name in new[] { nameof(UnsafeController.Missing), nameof(UnsafeController.Anonymous) })
        {
            var action = new ControllerActionDescriptor { ControllerName = "Unsafe", ActionName = name, ControllerTypeInfo = typeof(UnsafeController).GetTypeInfo(), MethodInfo = typeof(UnsafeController).GetMethod(name)! };
            var services = new ServiceCollection().AddSingleton<IActionDescriptorCollectionProvider>(new Descriptors(action));
            using var provider = services.BuildServiceProvider(); Assert.Throws<InvalidOperationException>(() => EndpointSecurityCheck.Validate(provider));
        }
    }
    [NonController] public sealed class UnsafeController { public void Missing() { } [AllowAnonymous] public void Anonymous() { } }
    sealed class Descriptors(ControllerActionDescriptor action) : IActionDescriptorCollectionProvider
    { public ActionDescriptorCollection ActionDescriptors { get; } = new([action], 0); }

    [Fact]
    public void AllResourcesRetainIsolationAndOperationPredicates()
    {
        // 仅验证纯条件构造，不调用持久化依赖；数据库行为由隔离 SQL Server 测试覆盖。
        var access = new AccessContext { Snapshot = Member() with { IsTenantAdmin = true } };
        var guard = new DataAccessGuard(access, new SecurityStore(null!, access));
        foreach (var resource in ResourceSecurityCatalog.Resources)
        {
            var predicate = guard.Predicate(resource, resource.Key + ".read");
            if (resource.Kind == ResourceKind.Platform) Assert.Equal("1 = 0", predicate);
            else { Assert.Contains("[IsDeleted] = 0", predicate); Assert.Contains("[TenantId] = 1", predicate); }
        }
        access.Snapshot = Member(new("bzss.projects.read", DataScopeType.TenantAll, []), new("bzss.projects.update", DataScopeType.Self, []));
        var update = guard.Predicate(ResourceSecurityCatalog.Entity("Project"), "bzss.projects.update");
        Assert.Contains("[OwnerUserId] = 11", update); Assert.Contains("[OwnershipConfirmed] = 1", update);
        Assert.Contains("[TenantId] = 1", update);
    }

    [Fact]
    public void SensitiveWriteContractsCannotCarryProtectedState()
    {
        foreach (var type in typeof(UserDto).Assembly.GetTypes().Where(x => x.Name.EndsWith("CreateDto") || x.Name.EndsWith("UpdateDto")))
        {
            Assert.Null(type.GetProperty("TenantId")); Assert.Null(type.GetProperty("SecurityVersion")); Assert.Null(type.GetProperty("OwnershipConfirmed"));
        }
        foreach (var name in new[] { "IsAdmin", "IsActived", "Email", "Password" }) Assert.Null(typeof(UserUpdateDto).GetProperty(name));
        Assert.Null(typeof(YamAuth.Dtos.Unit.EmployeeUpdateDto).GetProperty("UserId"));
        Assert.Null(typeof(YamAuth.Dtos.Bzss.ProjectUpdateDto).GetProperty("OwnerUserId"));
    }

    [Theory]
    [InlineData("bzss.companies.create")]
    [InlineData("bzss.companies.transfer")]
    [InlineData("bzss.projects.create")]
    [InlineData("bzss.projects.transfer")]
    public void OwnershipDestinationChecksBothTargetsAndPreservesScopeUnion(string permission)
    {
        var access = new AccessContext { Snapshot = Member(new OperationGrant(permission, DataScopeType.Self, [])) };
        var guard = new DataAccessGuard(access, new SecurityStore(null!, access));
        Assert.Equal(403, Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 11, 99)).Status);
        guard.ValidateDestination(permission, 11, 10);
        guard.ValidateDestination(permission, 11, null);
        access.Snapshot = access.Snapshot with { DepartmentId = null };
        guard.ValidateDestination(permission, 11, null);
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 11, 10));

        access.Snapshot = Member(new OperationGrant(permission, DataScopeType.Department, []));
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 88, 10, 99));
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 88, 10, null));
        guard.ValidateDestination(permission, 88, 10, 10);
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 88, null, 10));

        access.Snapshot = Member(new OperationGrant(permission, DataScopeType.CustomDepartments, [20]),
            new OperationGrant(permission, DataScopeType.CustomDepartments, [30]));
        // 负责人和业务归属可以在两个不同的授权部门，不要求两个字段来自同一个角色。
        guard.ValidateDestination(permission, 88, 30, 20);
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 88, 99, 20));
        access.Snapshot = Member(new OperationGrant(permission, DataScopeType.Self, []),
            new OperationGrant(permission, DataScopeType.CustomDepartments, [20]));
        guard.ValidateDestination(permission, 11, 20);
        guard.ValidateDestination(permission, 88, 20, 20);
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 88, 10, 20));
        access.Snapshot = Member(new OperationGrant("bzss.projects.read", DataScopeType.TenantAll, []));
        Assert.Throws<AccessException>(() => guard.ValidateDestination(permission, 11, 10, 10));
        access.Snapshot = Member(new OperationGrant(permission, DataScopeType.TenantAll, []));
        guard.ValidateDestination(permission, 88, null);
        guard.ValidateDestination(permission, 88, 99);
    }

    [Fact]
    public void MenuHierarchySeparatesApplicationBoundaryFromPagePermission()
    {
        var directory = new CrudMenu { Id = 1, AppsId = 100, MenuType = "dir", CrudId = null };
        var menu = new CrudMenu { Id = 2, ParentId = 1, AppsId = 100, MenuType = "menu", CrudId = 101 };
        DataAccessGuard.ValidateHierarchy(menu, new[] { directory });
        DataAccessGuard.ValidateHierarchy(new CrudMenu { Id = 3, ParentId = 1, AppsId = 100, MenuType = "menu", CrudId = 102 }, new[] { directory, menu });
        Assert.Throws<AccessException>(() => DataAccessGuard.ValidateHierarchy(new CrudMenu { AppsId = 200, ParentId = 1 }, new[] { directory }));
        Assert.Throws<AccessException>(() => DataAccessGuard.ValidateHierarchy(new CrudMenu { AppsId = 100, ParentId = 2 }, new[] { directory, menu }));
        Assert.Throws<AccessException>(() => DataAccessGuard.ValidateHierarchy(new CrudMenu { Id = 1, AppsId = 100, MenuType = "menu" }, new[] { directory, menu }));
        Assert.Throws<AccessException>(() => DataAccessGuard.ValidateHierarchy(new CrudItem { CrudId = 2, ParentId = 1 }, new[] { new CrudItem { Id = 1, CrudId = 1 } }));
        Assert.Throws<AccessException>(() => DataAccessGuard.ValidateHierarchy(new CrudRole { AppsId = 2, ParentId = 1 }, new[] { new CrudRole { Id = 1, AppsId = 1 } }));
        Assert.Throws<AccessException>(() => DataAccessGuard.ValidateHierarchy(new CrudRole { ParentId = -1 }, Array.Empty<CrudRole>()));
    }
    [Fact]
    public void CodeGenerationFailsBeforeWritingUnknownResourceAndPreservesBoundaries()
    {
        var root = Path.Combine(Path.GetTempPath(), "YamAuth_Codegen_" + Guid.NewGuid().ToString("N"));
        try
        {
            var controller = new ControllerGenerator { ApiProjectPath = root };
            Assert.Throws<InvalidOperationException>(() => controller.Generate(new TableInfo { TableName = "tb_New_Unknown", EntityName = "Unknown" }));
            Assert.False(Directory.Exists(root));
            foreach (var rule in ResourceSecurityCatalog.Resources)
            {
                var table = new TableInfo { TableName = rule.Table, EntityName = rule.Entity, Module = rule.Table.Split('_')[1], DatabaseName = rule.Kind == ResourceKind.Owned ? "YamBzss" : "YamBase", Columns = [new() { Name = "Id", SqlType = "bigint", IsPrimaryKey = true, IsIdentity = true }, new() { Name = "TenantId", SqlType = "bigint", IsNullable = true }, new() { Name = "Password", SqlType = "nvarchar" }, new() { Name = "IsAdmin", SqlType = "bit" }, new() { Name = "CreateTime", SqlType = "datetime2" }] };
                controller.Generate(table); new RepositoryGenerator { RepositoryProjectPath = root }.Generate(table); new DtoGenerator { DtosProjectPath = root }.Generate(table);
                var dto = File.ReadAllText(Path.Combine(root, table.Module, table.EntityName + "UpdateDto.cs")); Assert.DoesNotContain(" TenantId ", dto);
                if (rule.Entity == "User") { Assert.DoesNotContain(" Password ", dto); Assert.DoesNotContain(" IsAdmin ", dto); }
                var repo = File.ReadAllText(Path.Combine(root, table.DatabaseName, table.Module, table.EntityName, table.EntityName + "Repository.cs"));
                Assert.Contains("var select = Select;", repo); Assert.Contains("Guard.DecorateAsync", repo); Assert.DoesNotContain("Fsql.Select", repo);
            }
            foreach (var file in Directory.EnumerateFiles(root, "*Controller.cs", SearchOption.AllDirectories))
            { var source = File.ReadAllText(file); Assert.Equal(5, source.Split("[RequirePermission(").Length - 1); Assert.DoesNotContain("[AllowAnonymous]", source); }
        }
        finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }
}
