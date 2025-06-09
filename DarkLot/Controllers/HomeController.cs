using DarkLot.ApplicationServices.Lootlog;
using DarkLot.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace DarkLot.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly ILootlogService _lootlogService;


        public HomeController(ILogger<HomeController> logger, ILootlogService lootlogService)
        {
            _logger = logger;
            _lootlogService = lootlogService;
        }

        public async Task<IActionResult> Index(int page = 1)
        {
            int pageSize = 10;
            var vm = await _lootlogService.GetLootsPageAsync(page, pageSize);
            return View(vm);
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

    }
}
