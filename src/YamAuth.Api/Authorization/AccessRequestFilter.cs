using Microsoft.AspNetCore.Mvc.Filters;
using YamAuth.Authorization;
using YamAuth.Repository.Authorization;
using YamAuth.Service.Authorization;

namespace YamAuth.Api.Authorization;

/// <summary>所有已认证写操作在同一事务内重新核对权威状态，并将事务显式传给读写和审计。</summary>
public sealed class AccessRequestFilter(AccessContext access, AccessService service, SecurityStore store) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        access.TraceId = context.HttpContext.TraceIdentifier;
        if (access.Snapshot is { } snapshot)
        {
            context.HttpContext.Response.Headers["X-YamAuth-Authorization-Version"] = snapshot.AuthorizationVersion.ToString();
            context.HttpContext.Response.Headers["X-YamAuth-Catalog-Version"] = snapshot.CatalogVersion.ToString();
        }
        var version = context.HttpContext.Request.Headers.IfMatch.ToString();
        if (!string.IsNullOrEmpty(version))
        {
            try
            {
                access.ExpectedVersion = Convert.FromBase64String(version.Trim('"'));
                if (access.ExpectedVersion.Length != 8) throw new FormatException();
            }
            catch (FormatException) { throw new AccessException("If-Match 并发版本格式错误", 400); }
        }
        if (access.Snapshot == null || HttpMethods.IsGet(context.HttpContext.Request.Method) || HttpMethods.IsHead(context.HttpContext.Request.Method))
        {
            await next(); return;
        }
        await store.WriteAsync(async () =>
        {
            var previous = access.Require();
            var current = await service.LoadAsync(previous.UserId, previous.SessionId, previous.SecurityVersion, previous.ContextId, writing: true);
            access.Snapshot = current;
            var operation = access.RequireOperation();
            AccessPolicyHandler.Ensure(current, ResourceSecurityCatalog.Permission(operation) != null ? "permission:" + operation : operation);
            var executed = await next();
            if (executed.Exception != null && !executed.ExceptionHandled)
                System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(executed.Exception).Throw();
        });
    }
}
