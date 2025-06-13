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
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if(userId == null)
            {
                return RedirectToAction("Index","Home");
            }
            var pagedResult = await _fightViewService.GetAllBattlesAsync(page, pageSize, userId);

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
        [HttpDelete]
        public async Task<IActionResult> Delete(int battleId)
        {
            try
            {
                await _fightViewService.DeleteBattleById(battleId);
                return Ok();
            }
            catch (Exception ex)
            {
                return NotFound();
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetPageJson(int page, int pageSize = 10)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var paged = await _fightViewService.GetAllBattlesAsync(page, pageSize, userId);
            return Ok(paged.Battles);
        }

        [HttpGet]
        public async Task<IActionResult> GetPagingInfo(int page, int pageSize = 10)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var paged = await _fightViewService.GetAllBattlesAsync(page, pageSize, userId);
            return Ok(new
            {
                CurrentPage = paged.CurrentPage,
                TotalPages = paged.TotalPages
            });
        }
    }
}
