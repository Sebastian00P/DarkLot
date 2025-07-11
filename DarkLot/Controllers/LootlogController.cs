﻿using DarkLot.ApplicationServices.Lootlog;
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
            return Json(new { status = "ok", message = "ok" });
        }

        [HttpPost("api/lootlog/add")]
        public async Task<IActionResult> Add([FromBody] AddLootItemDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if (!dto.LootUsers.Any() || string.IsNullOrEmpty(dto.MobName))
                return Ok(new { status = "ok" });
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { status = "error", message = "User not authenticated" });
            await _lootlogService.AddLootAsync(dto, userId);

            return Ok(new { status = "ok" });
        }
    }
}
