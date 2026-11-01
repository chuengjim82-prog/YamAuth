using Mapster;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public partial class UserService
{
    public async Task<long> CreateAsync(UserCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new BusinessException("密码不能为空");

        dto.Email = UserEmailHelper.Normalize(dto.Email);
        await EnsureEmailAvailableAsync(dto.Email);

        var entity = dto.Adapt<User>();
        entity.Email = dto.Email;
        var (hash, salt) = PasswordHelper.Hash(dto.Password);
        entity.Password = hash;
        entity.PwdSalt = salt;
        return await _repo.InsertAsync(entity);
    }

    public async Task UpdateAsync(long id, UserUpdateDto dto)
    {
        var entity = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        var savedPassword = entity.Password;
        var savedPwdSalt = entity.PwdSalt;

        dto.Email = UserEmailHelper.Normalize(dto.Email);
        await EnsureEmailAvailableAsync(dto.Email, id);

        dto.Adapt(entity);
        entity.Id = id;
        entity.Email = dto.Email;

        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            var (hash, salt) = PasswordHelper.Hash(dto.Password);
            entity.Password = hash;
            entity.PwdSalt = salt;
        }
        else
        {
            entity.Password = savedPassword;
            entity.PwdSalt = savedPwdSalt;
        }

        await _repo.UpdateAsync(entity);
    }

    async Task EnsureEmailAvailableAsync(string email, long? excludeUserId = null)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessException("邮箱不能为空", 400);
        if (await _repo.ExistsEmailAsync(email, excludeUserId))
            throw new BusinessException("邮箱已被使用", 400);
    }
}
