using FluentValidation;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Validators;

// 目录不要求操作字段非空；后台操作与代码目录的一致性由 DataAccessGuard 校验。
public sealed class CrudInfoCreateDtoValidator : AbstractValidator<CrudInfoCreateDto>
{
    public CrudInfoCreateDtoValidator()
    {
        RuleFor(x => x.CrudName).MaximumLength(50);
        RuleFor(x => x.CrudCode).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Remark).MaximumLength(255);
        RuleFor(x => x.NodeType).Must(x => x is "Directory" or "Operation").WithMessage("请选择目录或操作节点");
        RuleFor(x => x.ResourceKey).NotNull().MaximumLength(128);
        RuleFor(x => x.OperationCode).NotNull().MaximumLength(64);
    }
}

public sealed class CrudInfoUpdateDtoValidator : AbstractValidator<CrudInfoUpdateDto>
{
    public CrudInfoUpdateDtoValidator()
    {
        RuleFor(x => x.CrudName).MaximumLength(50);
        RuleFor(x => x.CrudCode).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Remark).MaximumLength(255);
        RuleFor(x => x.NodeType).Must(x => x is "Directory" or "Operation").WithMessage("请选择目录或操作节点");
        RuleFor(x => x.ResourceKey).NotNull().MaximumLength(128);
        RuleFor(x => x.OperationCode).NotNull().MaximumLength(64);
    }
}
