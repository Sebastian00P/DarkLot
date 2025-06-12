using DarkLot.ApplicationServices.FightView;
using DarkLot.Dtos.BattleDtos;
using DarkLot.Models.UserModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class BattleController : ControllerBase
    {
        private readonly IFightViewService _fightViewService;
        private readonly UserManager<ApplicationUser> _userManager;

        public BattleController(
            IFightViewService fightViewService,
            UserManager<ApplicationUser> userManager)
        {
            _fightViewService = fightViewService;
            _userManager = userManager;
        }

        [HttpPost("addBattle")]
        public async Task<IActionResult> AddBattle([FromBody] BattleDto battleDto)
        {
            // Pobierz ID zalogowanego użytkownika
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (userId == null)
            {
                return BadRequest("Nie udało się zaleźć użytkownika.");
            }
            var fighterId = battleDto.Fighters.Where(x => Convert.ToInt32(x.FighterId) < 0).FirstOrDefault();
            if (fighterId != null)
            {
                return Ok();
            }

            var battleId = await _fightViewService.AddBattleAsync(battleDto, userId);

            return Ok();
        }
    }
}
