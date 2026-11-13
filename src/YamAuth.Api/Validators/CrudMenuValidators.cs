using FluentValidation;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Validators;

// 菜单业务规则由手写校验器维护，CodeGen 跳过这两个 DTO。
public sealed class CrudMenuCreateDtoValidator : AbstractValidator<CrudMenuCreateDto>
{
    public CrudMenuCreateDtoValidator()
    {
        RuleFor(x => x.MenuCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.MenuName).MaximumLength(50);
        RuleFor(x => x.MenuType).Must(value => CrudMenuTypeCodes.TryParse(value, out _))
            .WithMessage("菜单类型只能选择目录或菜单");
        RuleFor(x => x.IconName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.RoutePath).MaximumLength(200);
        RuleFor(x => x.Redirect).MaximumLength(200);
        RuleFor(x => x.Remark).MaximumLength(255);
    }
}

public sealed class CrudMenuUpdateDtoValidator : AbstractValidator<CrudMenuUpdateDto>
{
    public CrudMenuUpdateDtoValidator()
    {
        RuleFor(x => x.MenuCode).NotEmpty().MaximumLength(50);
        RuleFor(x => x.MenuName).MaximumLength(50);
        RuleFor(x => x.MenuType).Must(value => CrudMenuTypeCodes.TryParse(value, out _))
            .WithMessage("菜单类型只能选择目录或菜单");
        RuleFor(x => x.IconName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.RoutePath).MaximumLength(200);
        RuleFor(x => x.Redirect).MaximumLength(200);
        RuleFor(x => x.Remark).MaximumLength(255);
    }
}
