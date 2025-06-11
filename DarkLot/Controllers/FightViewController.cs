using DarkLot.ApplicationServices.FightView;
using DarkLot.ViewModeles.BattlesViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize]
    public class FightViewController : Controller
    {
        private readonly IFightViewService _fightViewService;
        public FightViewController(IFightViewService fightViewService)
        {
            _fightViewService = fightViewService;
        }

        public async Task<IActionResult> Index(int page = 1)
        {
            const int pageSize = 10;

            var allBattles = await _fightViewService.GetAllBattlesAsync();

            int totalBattles = allBattles.Count;
            int totalPages = (int)Math.Ceiling(totalBattles / (double)pageSize);

            var pagedBattles = allBattles
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var model = new BattlesListViewModel
            {
                Battles = pagedBattles,
                CurrentPage = page,
                TotalPages = totalPages
            };

            return View(model);
        }


        public async Task<IActionResult> Details(int battleId)
        {
            var battle = await _fightViewService.GetBattleByIdAsync(battleId);
            if (battle == null) return NotFound();
            return View(battle);
        }
    }
}
