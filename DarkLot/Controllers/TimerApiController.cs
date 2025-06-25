using DarkLot.ApplicationServices.Timers;
using DarkLot.Dtos.TimerDtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DarkLot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TimerApiController : ControllerBase
    {
        private readonly ITimerService _timerService;

        public TimerApiController(ITimerService timerService)
        {
            _timerService = timerService;
        }

        /// <summary>
        /// Klient gry zgłasza zbicie moba.
        /// POST /api/timerapi/mobkill
        /// Body: { mobName, level, monsterType }
        /// </summary>
        [HttpPost("mobkill")]
        public async Task<IActionResult> RecordMobKill([FromBody] MobKillInputDto dto)
        {
            if (dto == null
             || string.IsNullOrWhiteSpace(dto.MobName)
             || dto.Level <= 0
             || string.IsNullOrWhiteSpace(dto.MonsterType))
            {
                return BadRequest("Nieprawidłowe dane wejściowe.");
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            await _timerService.RecordMobKillAsync(userId, dto.MobName, dto.Level, dto.MonsterType);
            return Ok();
        }
    }
}
