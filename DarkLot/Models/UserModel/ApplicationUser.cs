using DarkLot.DbModelHelpers;
using Microsoft.AspNetCore.Identity;

namespace DarkLot.Models.UserModel
{
    public class ApplicationUser : IdentityUser
    {
        public string NickName { get; set; }
        public DateTime CreationTime { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
    }
}
