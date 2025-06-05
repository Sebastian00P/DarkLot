using DarkLot.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace DarkLot.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
        [HttpGet("api/publicdata")]       // dostęp pod https://localhost:7238/api/publicdata
        [AllowAnonymous]                   // wyłącza wymóg autoryzacji
        public IActionResult PublicData()
        {
            var result = new
            {
                message = "To jest publiczny JSON z serwera",
                serverTimeUtc = DateTime.UtcNow
            };
            return Json(result);
        }
    }
}
