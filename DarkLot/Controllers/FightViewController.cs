using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize]
    public class FightViewController : Controller
    {
        public async Task<IActionResult> Index()
        {
            return View();
        }
    }
}
