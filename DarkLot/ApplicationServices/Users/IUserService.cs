using DarkLot.Models.UserModel;
using Microsoft.AspNetCore.Identity;

namespace DarkLot.ApplicationServices.Users
{
    public interface IUserService
    {
        Task<List<ApplicationUser>> GetAllUsersAsync();
    }
}
