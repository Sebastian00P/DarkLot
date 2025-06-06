using DarkLot.ApplicationServices.Lootlog;
using DarkLot.Dtos.LootlogDtos;
using DarkLot.Models.Lootlog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DarkLot.Controllers
{
    [Authorize]
    [ApiController]
    public class LootlogController : Controller
    {
        private readonly ILootlogService _lootlogService;

        public LootlogController(ILootlogService lootlogService)
        {
            _lootlogService = lootlogService;
        }

        [HttpGet]
        [Route("api/lootlog/check")]
        public IActionResult Check()
        {
            return Json(new { status = "ok", message = "Działa" });
        }

        [HttpPost("api/lootlog/add")]
        public async Task<IActionResult> Add([FromBody] AddLootItemDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            await _lootlogService.AddLootAsync(dto, userId);

            return Ok(new { status = "ok" });
        }
    }
}
