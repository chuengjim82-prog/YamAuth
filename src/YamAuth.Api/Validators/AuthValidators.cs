using FluentValidation;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Validators;

public class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().WithMessage("请输入用户名或邮箱").MaximumLength(128);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}

public class UserCreateDtoValidator : AbstractValidator<UserCreateDto>
{
    public UserCreateDtoValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().WithMessage("请输入用户名").MaximumLength(64);
        RuleFor(x => x.NickName).NotEmpty().WithMessage("请输入昵称").MaximumLength(64);
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("请输入初始密码")
            .MinimumLength(6).WithMessage("密码至少 6 位")
            .MaximumLength(128).WithMessage("密码最多 128 位");
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("请输入邮箱")
            .EmailAddress().WithMessage("邮箱格式不正确")
            .MaximumLength(128);
    }
}

public class UserUpdateDtoValidator : AbstractValidator<UserUpdateDto>
{
    public UserUpdateDtoValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().MaximumLength(64);
        RuleFor(x => x.NickName).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Password).MinimumLength(6).MaximumLength(128).When(x => !string.IsNullOrWhiteSpace(x.Password));
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("请输入邮箱")
            .EmailAddress().WithMessage("邮箱格式不正确")
            .MaximumLength(128);
    }
}

public class ChangePasswordDtoValidator : AbstractValidator<ChangePasswordDto>
{
    public ChangePasswordDtoValidator()
    {
        RuleFor(x => x.OldPassword).NotEmpty().WithMessage("请输入原密码").MaximumLength(128);
        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("请输入新密码")
            .MinimumLength(6).WithMessage("密码至少 6 位")
            .MaximumLength(128);
    }
}
