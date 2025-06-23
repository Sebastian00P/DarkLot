using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize(Roles = "Admin")]
    public class ClansController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
