using DarkLot.ApplicationServices.Users;

namespace DarkLot.ServiceRegistartor
{
    public static class ServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<IUserService, UserService>();

            return services;
        }
    }
}
