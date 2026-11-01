using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace YamAuth.Api.Filters;

/// <summary>
/// 替代已弃用的 FluentValidation.AspNetCore 自动校验：对 Action 复杂类型参数调用已注册的 IValidator&lt;T&gt;。
/// 失败时返回 ValidationProblemDetails，由 <see cref="ApiResultFilter"/> 包装为统一 ApiResult。
/// </summary>
public sealed class FluentValidationActionFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null || !ShouldValidate(argument.GetType()))
                continue;

            var result = await ValidateAsync(context.HttpContext.RequestServices, argument, context.HttpContext.RequestAborted);
            if (result is null || result.IsValid)
                continue;

            context.Result = new BadRequestObjectResult(ToValidationProblemDetails(result));
            return;
        }

        await next();
    }

    static bool ShouldValidate(Type type) =>
        type != typeof(string)
        && type != typeof(CancellationToken)
        && !type.IsPrimitive
        && !type.IsEnum;

    static async Task<ValidationResult?> ValidateAsync(
        IServiceProvider services,
        object instance,
        CancellationToken cancellation)
    {
        var type = instance.GetType();
        var validatorType = typeof(IValidator<>).MakeGenericType(type);
        if (services.GetService(validatorType) is not IValidator validator)
            return null;

        var contextType = typeof(ValidationContext<>).MakeGenericType(type);
        var validationContext = (IValidationContext)Activator.CreateInstance(contextType, instance)!;
        return await validator.ValidateAsync(validationContext, cancellation);
    }

    static ValidationProblemDetails ToValidationProblemDetails(ValidationResult result)
    {
        var errors = result.Errors
            .GroupBy(e => string.IsNullOrEmpty(e.PropertyName) ? string.Empty : e.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

        return new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "One or more validation errors occurred."
        };
    }
}
