using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace YamAuth.Service.Abstractions;

public static class ServiceServiceCollectionExtensions
{
    public static IServiceCollection AddYamAuthServices(this IServiceCollection services)
    {
        var asm = typeof(IService).Assembly;
        var impls = asm.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && typeof(IService).IsAssignableFrom(t));
        foreach (var impl in impls)
        {
            var iface = impl.GetInterfaces().FirstOrDefault(i => i.Name == "I" + impl.Name);
            if (iface != null) services.AddScoped(iface, impl);
        }
        return services;
    }
}
