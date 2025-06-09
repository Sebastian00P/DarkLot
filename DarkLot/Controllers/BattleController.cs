using DarkLot.ApplicationServices.FightView;
using DarkLot.Dtos.BattleDtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class BattleController : ControllerBase
    {
        private readonly IFightViewService _fightViewService;

        public BattleController(IFightViewService fightViewService)
        {
            _fightViewService = fightViewService;
        }

        [HttpPost]
        [Route("add")]
        public async Task<IActionResult> AddBattle([FromBody] BattleDto dto)
        {
            if (dto == null || dto.Fighters == null || dto.Logs == null)
                return BadRequest("Niepoprawne dane");

            var id = await _fightViewService.AddBattleAsync(dto);
            return Ok(new { id });
        }
    }
}
