using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Options;
using YamAuth.Authorization;
using YamAuth.Service.Authorization;

namespace YamAuth.Api.Authorization;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequirePermissionAttribute(string permission) : AuthorizeAttribute("permission:" + permission)
{
    public string Permission { get; } = permission;
}

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class AccessPolicyAttribute(string policy) : AuthorizeAttribute(policy)
{
    public string AccessPolicy { get; } = policy;
}

public sealed record AccessRequirement(string Policy) : IAuthorizationRequirement;

public sealed class AccessPolicyProvider(IOptions<AuthorizationOptions> options) : DefaultAuthorizationPolicyProvider(options)
{
    public override Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith("permission:", StringComparison.Ordinal) || policyName.StartsWith("self:", StringComparison.Ordinal)
            || policyName is "platform" or "tenant-manager" or "audit")
            return Task.FromResult<AuthorizationPolicy?>(new AuthorizationPolicyBuilder().RequireAuthenticatedUser()
                .AddRequirements(new AccessRequirement(policyName)).Build());
        return base.GetPolicyAsync(policyName);
    }
}

public sealed class AccessPolicyHandler(AccessContext access, AccessService service, IHttpContextAccessor http)
    : AuthorizationHandler<AccessRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AccessRequirement requirement)
    {
        var current = access.Require();
        if (requirement.Policy is not ("self:password" or "self:logout"))
        {
            var header = http.HttpContext?.Request.Headers[ResourceSecurityCatalog.ContextHeader].ToString();
            if (!string.IsNullOrEmpty(header))
            {
                if (!Guid.TryParse(header, out var id)) throw new AccessException("租户管理上下文无效", 403, "ContextInvalidated");
                current = await service.LoadAsync(current.UserId, current.SessionId, current.SecurityVersion, id);
                access.Snapshot = current;
            }
        }
        access.Operation = requirement.Policy.StartsWith("permission:", StringComparison.Ordinal) ? requirement.Policy[11..] : requirement.Policy;
        Ensure(current, requirement.Policy);
        context.Succeed(requirement);
    }

    public static void Ensure(AccessSnapshot current, string policy)
    {
        if (current.MustChangePassword && policy is not ("self:me" or "self:password" or "self:logout"))
            throw new AccessException("请先修改初始密码", 403, "PasswordChangeRequired");
        if (policy.StartsWith("self:", StringComparison.Ordinal)) return;
        if (policy == "platform" && current.IsPlatformAdmin) return;
        if (policy == "tenant-manager" && current.IsTenantManager) return;
        if (policy == "audit" && (current.IsPlatformAdmin || current.IsTenantManager)) return;
        if (policy.StartsWith("permission:", StringComparison.Ordinal) && current.Can(policy[11..])) return;
        throw new AccessException("没有执行该操作的权限");
    }
}

public static class EndpointSecurityCheck
{
    public static void Validate(IServiceProvider services)
    {
        var actions = services.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors.Items.OfType<ControllerActionDescriptor>();
        foreach (var action in actions)
        {
            var attributes = action.MethodInfo.GetCustomAttributes(true).Concat(action.ControllerTypeInfo.GetCustomAttributes(true)).ToArray();
            if (attributes.OfType<AllowAnonymousAttribute>().Any())
            {
                if (action.ControllerName != "Login" || action.ActionName != "Login")
                    throw new InvalidOperationException($"未登记的匿名业务端点：{action.DisplayName}");
                continue;
            }
            var permissions = attributes.OfType<RequirePermissionAttribute>().ToArray();
            var policies = attributes.OfType<AccessPolicyAttribute>().ToArray();
            if (permissions.Length + policies.Length != 1 || permissions.Any(x => ResourceSecurityCatalog.Permission(x.Permission) == null))
                throw new InvalidOperationException($"端点缺少唯一且有效的访问策略：{action.DisplayName}");
            foreach (var policy in policies)
                if (policy.AccessPolicy is not ("self:me" or "self:access" or "self:profile" or "self:email" or "self:password" or "self:logout" or "platform" or "tenant-manager" or "audit" or "self:candidates"))
                    throw new InvalidOperationException($"未知专用策略：{policy.AccessPolicy}");
        }
    }
}
