using DarkLot.Models.UserModel;
using Microsoft.AspNetCore.Identity;

namespace DarkLot.ApplicationServices.Roles
{
    public interface IRoleService
    {
        Task<List<IdentityRole>> GetAllRolesAsync();
        Task<IdentityRole?> GetRoleByIdAsync(string roleId);
        Task<IdentityResult> CreateRoleAsync(string roleName);
        Task<IdentityResult> UpdateRoleAsync(string roleId, string newName);
        Task<IdentityResult> DeleteRoleAsync(string roleId);

        Task<IList<string>> GetUserRolesAsync(ApplicationUser user);
        Task<IdentityResult> AddUserToRoleAsync(ApplicationUser user, string roleName);
        Task<IdentityResult> RemoveUserFromRoleAsync(ApplicationUser user, string roleName);
    }
}
