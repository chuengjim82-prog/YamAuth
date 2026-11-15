using FluentValidation;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Validators;

public sealed class ProfileUpdateValidator : AbstractValidator<ProfileUpdateDto>
{
    public ProfileUpdateValidator()
    {
        RuleFor(x => x.NickName).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Avatar).NotNull().MaximumLength(500);
        RuleFor(x => x.Phone).NotNull().MaximumLength(64);
    }
}
public sealed class EmailChangeValidator : AbstractValidator<EmailChangeDto>
{
    public EmailChangeValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(128);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}
public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordDto>
{
    public ResetPasswordValidator() => RuleFor(x => x.Password).NotEmpty().MinimumLength(6).MaximumLength(128);
}
public sealed class EnterTenantValidator : AbstractValidator<EnterTenantDto>
{
    public EnterTenantValidator() => RuleFor(x => x.TenantId).GreaterThan(0);
}
public sealed class OwnershipTransferValidator : AbstractValidator<OwnershipTransferDto>
{
    public OwnershipTransferValidator()
    {
        RuleFor(x => x.OwnerUserId).GreaterThan(0);
        RuleFor(x => x.OwnerDepartmentId).GreaterThan(0).When(x => x.OwnerDepartmentId.HasValue);
    }
}
public sealed class EmployeeAssignmentValidator : AbstractValidator<EmployeeAssignmentDto>
{
    public EmployeeAssignmentValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0).When(x => x.UserId.HasValue);
        RuleFor(x => x.DepartmentId).GreaterThan(0).When(x => x.DepartmentId.HasValue);
    }
}

public sealed class CandidateQueryValidator : AbstractValidator<CandidateQueryDto>
{
    public CandidateQueryValidator()
    {
        RuleFor(x => x.Purpose).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Kind).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Ids).NotNull().Must(x => x == null || x.Length <= 200);
        RuleForEach(x => x.Ids).GreaterThan(0);
    }
}
