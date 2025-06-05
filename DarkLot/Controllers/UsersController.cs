using DarkLot.ApplicationServices.Users;
using DarkLot.Models.UserModel;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    public class UsersController : Controller
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        public async Task<IActionResult> Index()
        {
            List<ApplicationUser> users = await _userService.GetAllUsersAsync();
            return View(users);
        }
    }
}
