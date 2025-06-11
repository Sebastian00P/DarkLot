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

            var pagedResult = await _fightViewService.GetAllBattlesAsync(page, pageSize);

            var model = new BattlesListViewModel
            {
                Battles = pagedResult.Battles,
                CurrentPage = pagedResult.CurrentPage,
                TotalPages = pagedResult.TotalPages
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
