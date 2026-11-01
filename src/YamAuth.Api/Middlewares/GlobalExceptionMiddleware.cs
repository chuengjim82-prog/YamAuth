using System.Text.Json;
using YamAuth.Service.Abstractions;

namespace YamAuth.Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    // 与 MVC 管道（System.Text.Json 默认 camelCase）保持一致，
    // 否则异常响应 {Code,...} 与正常响应 {code,...} 大小写不一，前端拦截器会识别不了。
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next; _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await _next(ctx); }
        catch (BusinessException ex)
        {
            _logger.LogWarning(ex, "BusinessException: {Msg}", ex.Message);
            await Write(ctx, ex.Code, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            await Write(ctx, 401, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await Write(ctx, 500, "服务器内部错误");
        }
    }

    static async Task Write(HttpContext ctx, int code, string message)
    {
        ctx.Response.ContentType = "application/json";
        ctx.Response.StatusCode = code switch { 401 => 401, 403 => 403, 4011 => 401, _ => 200 };
        var body = JsonSerializer.Serialize(new ApiResult
        {
            Code = code, Message = message, TraceId = ctx.TraceIdentifier
        }, JsonOptions);
        await ctx.Response.WriteAsync(body);
    }
}

