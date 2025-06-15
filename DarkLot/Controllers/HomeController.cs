using DarkLot.ApplicationServices.Lootlog;
using DarkLot.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace DarkLot.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly ILootlogService _lootlogService;


        public HomeController(ILogger<HomeController> logger, ILootlogService lootlogService)
        {
            _logger = logger;
            _lootlogService = lootlogService;
        }

        public async Task<IActionResult> Index(
            int page = 1,
            bool filterHeroic = false,
            bool filterLegendary = false)
        {
            const int pageSize = 10;

            // Przekazujemy stany checkboxów dalej do serwisu
            var vm = await _lootlogService
                .GetLootsPageAsync(page, pageSize, filterHeroic, filterLegendary);

            // Zapamiętaj w VM, żeby przy renderze widoku checkboxy były w odpowiednim stanie
            vm.FilterHeroic = filterHeroic;
            vm.FilterLegendary = filterLegendary;

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
