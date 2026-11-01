using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using YamAuth.Service.Abstractions;

namespace YamAuth.Api.Filters;

/// <summary>
/// 统一响应包装：把 Controller 的返回值套进 ApiResult { code, message, data, traceId }。
/// - 普通对象返回值 → code:0
/// - 无返回值 action（void/Task）→ code:0 + data:null
/// - ProblemDetails / 验证失败 → 按其状态码作为业务 code（HTTP 仍 200，与 BusinessException 一致）
/// - 已是 ApiResult 的不再二次包装
/// </summary>
public class ApiResultFilter : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        var traceId = context.HttpContext.TraceIdentifier;

        switch (context.Result)
        {
            // 已经是 ApiResult，放行
            case ObjectResult o when o.Value is ApiResult:
                break;

            // 验证失败 / ProblemDetails：按其状态码作为业务 code，Message 取首条字段错误
            case ObjectResult { Value: ValidationProblemDetails vpd }:
                context.Result = new ObjectResult(new ApiResult
                {
                    Code = vpd.Status ?? 400,
                    Message = FirstValidationMessage(vpd),
                    Data = vpd.Errors,
                    TraceId = traceId
                });
                break;

            case ObjectResult { Value: ProblemDetails pd }:
                context.Result = new ObjectResult(new ApiResult
                {
                    Code = pd.Status ?? 400,
                    Message = pd.Title ?? "请求无效",
                    Data = (pd as ValidationProblemDetails)?.Errors,
                    TraceId = traceId
                });
                break;

            // 普通对象返回值：包成 code:0
            case ObjectResult obj:
                context.Result = new ObjectResult(new ApiResult
                {
                    Code = 0,
                    Message = "OK",
                    Data = obj.Value,
                    TraceId = traceId
                });
                break;

            // 无返回值 action（void / Task）：返回 code:0 + data:null
            case EmptyResult:
                context.Result = new ObjectResult(new ApiResult
                {
                    Code = 0,
                    Message = "OK",
                    Data = null,
                    TraceId = traceId
                });
                break;
        }

        await next();
    }

    static string FirstValidationMessage(ValidationProblemDetails vpd)
    {
        foreach (var pair in vpd.Errors)
        {
            if (pair.Value is { Length: > 0 } errors && !string.IsNullOrWhiteSpace(errors[0]))
                return errors[0];
        }
        return vpd.Title ?? "请求无效";
    }
}
