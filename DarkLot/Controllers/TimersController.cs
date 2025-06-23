using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize]
    public class TimersController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
