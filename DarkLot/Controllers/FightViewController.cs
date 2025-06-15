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

        public async Task<IActionResult> Favorite(int page = 1)
        {
            const int pageSize = 10;
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return RedirectToAction("Index", "Home");
            }
            var pagedResult = await _fightViewService.GetAllFavoriteBattlesAsync(page, pageSize, userId);

            var model = new BattlesListViewModel
            {
                Battles = pagedResult.Battles,
                CurrentPage = pagedResult.CurrentPage,
                TotalPages = pagedResult.TotalPages
            };

            return View(model);
        }

        public async Task<IActionResult> Shared(int page = 1)
        {
            const int pageSize = 10;
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return RedirectToAction("Index", "Home");
            }
            var pagedResult = await _fightViewService.GetAllSharedBattlesAsync(page, pageSize, userId);

            var model = new BattlesListViewModel
            {
                Battles = pagedResult.Battles,
                CurrentPage = pagedResult.CurrentPage,
                TotalPages = pagedResult.TotalPages
            };

            return View(model);
        }

        [AllowAnonymous]
        public async Task<IActionResult> SharedBattles(int page = 1)
        {
            const int pageSize = 10;

            var pagedResult = await _fightViewService.GetAllSharedBattlesAsync(page, pageSize);

            var model = new BattlesListViewModel
            {
                Battles = pagedResult.Battles,
                CurrentPage = pagedResult.CurrentPage,
                TotalPages = pagedResult.TotalPages
            };

            return View(model);
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

        [HttpGet]
        public async Task<IActionResult> GetPagingFavoriteInfo(int page, int pageSize = 10)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var paged = await _fightViewService.GetAllFavoriteBattlesAsync(page, pageSize, userId);
            return Ok(new
            {
                CurrentPage = paged.CurrentPage,
                TotalPages = paged.TotalPages
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetPagingSharedInfo(int page, int pageSize = 10)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var paged = await _fightViewService.GetAllSharedBattlesAsync(page, pageSize, userId);
            return Ok(new
            {
                CurrentPage = paged.CurrentPage,
                TotalPages = paged.TotalPages
            });
        }

        [HttpPut]
        public async Task<IActionResult> ChangeBattleToFavorite(int battleId)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var newState = await _fightViewService.TogleBattleFavoriteState(battleId, userId);
            return Ok(newState);
        }
        [HttpPut]
        public async Task<IActionResult> ChangeBattleToShared(int battleId)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var newState = await _fightViewService.TogleBattleSharedState(battleId, userId);
            return Ok(newState);
        }
    }
}
