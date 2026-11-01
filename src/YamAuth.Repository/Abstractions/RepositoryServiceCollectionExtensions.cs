using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace YamAuth.Repository.Abstractions;

public static class RepositoryServiceCollectionExtensions
{
    public static IServiceCollection AddYamAuthRepositories(this IServiceCollection services)
    {
        var asm = typeof(IRepository).Assembly;
        var impls = asm.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && typeof(IRepository).IsAssignableFrom(t));
        foreach (var impl in impls)
        {
            // 找名字以 I 开头、与 impl 同名的接口（IUserRepository ← UserRepository）
            var iface = impl.GetInterfaces().FirstOrDefault(i => i.Name == "I" + impl.Name);
            if (iface != null) services.AddScoped(iface, impl);
        }
        return services;
    }
}
