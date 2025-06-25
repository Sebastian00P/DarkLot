using DarkLot.ApplicationServices.Chat;
using DarkLot.ApplicationServices.Clans;
using DarkLot.ApplicationServices.FightView;
using DarkLot.ApplicationServices.Lootlog;
using DarkLot.ApplicationServices.Roles;
using DarkLot.ApplicationServices.Timers;
using DarkLot.ApplicationServices.Users;
using Microsoft.AspNetCore.Identity.UI.Services;

namespace DarkLot.ServiceRegistartor
{
    public static class ServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<IUserService, UserService>();
            services.AddTransient<IEmailSender, NoOpEmailSender>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<ILootlogService, LootlogService>();
            services.AddScoped<IFightViewService, FightViewService>();
            services.AddScoped<IClanService, ClanService>();
            services.AddScoped<IChatService, ChatService>();
            services.AddScoped<ITimerService, TimerService>();

            return services;
        }
    }
}
