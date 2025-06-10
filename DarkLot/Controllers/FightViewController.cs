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

        public async Task<IActionResult> Index()
        {
            var battles = await _fightViewService.GetAllBattlesAsync();

            return View(battles);
        }

        public async Task<IActionResult> Details(int battleId)
        {
            var battle = await _fightViewService.GetBattleByIdAsync(battleId);
            if (battle == null) return NotFound();
            return View(battle);
        }
    }
}
