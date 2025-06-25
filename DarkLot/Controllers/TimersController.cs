using DarkLot.ApplicationServices.Clans;
using DarkLot.ApplicationServices.Timers;
using DarkLot.Models.Timer;
using DarkLot.ViewModeles.TimerViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Security.Claims;

namespace DarkLot.Controllers
{
    [Authorize]
    public class TimersController : Controller
    {
        private readonly ITimerService _timerService;
        private readonly IClanService _clanService;

        public TimersController(
            ITimerService timerService,
            IClanService clanService)
        {
            _timerService = timerService;
            _clanService = clanService;
        }

        public async Task<IActionResult> Index(string clanId = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var clans = await _clanService.GetClansForUserAsync(userId);

            if (string.IsNullOrEmpty(clanId) && clans.Any())
                clanId = clans.First().Id;

            var clanItems = clans.Select(c => new SelectListItem
            {
                Value = c.Id,
                Text = c.Name,
                Selected = c.Id == clanId
            });

            var timers = new System.Collections.Generic.List<TimerViewModel>();
            if (!string.IsNullOrEmpty(clanId))
            {
                var entities = await _timerService.GetActiveTimersForClanAsync(clanId);
                timers = entities.Select(t => new TimerViewModel
                {
                    Id = t.Id,
                    MobName = t.MobName,
                    Level = t.Level,
                    MonsterType = t.MonsterType,
                    KilledAt = t.KilledAt,
                    RespawnTime = CalculateRespawnTime(t.Level, t.KilledAt),
                    Remaining = "",
                    KilledByNick = t.KilledByUser.NickName
                }).ToList();
            }

            var vm = new TimersIndexViewModel
            {
                Clans = clanItems,
                ActiveClanId = clanId,
                Timers = timers
            };

            return View(vm);
        }

        private DateTime CalculateRespawnTime(int level, DateTime killedAt)
        {
            var lvl = Math.Min(200, level);
            double respawnSeconds = 40
                + 10.85 * lvl
                - 0.02721 * lvl * lvl;
            return killedAt.AddSeconds(respawnSeconds);
        }
    }
}
