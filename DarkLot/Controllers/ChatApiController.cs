using DarkLot.ApplicationServices.Chat;
using DarkLot.ApplicationServices.Users;
using DarkLot.Dtos.ChatDtos;
using DarkLot.Hubs;
using DarkLot.Models.UserModel;
using DarkLot.ViewModeles.ChatViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace DarkLot.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChatApiController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public ChatApiController(
            IChatService chatService,
            IHubContext<ChatHub> hubContext,
            UserManager<ApplicationUser> userManager)
        {
            _chatService = chatService;
            _hubContext = hubContext;
            _userManager = userManager;
        }

        // GET /api/chatapi/{clanId}
        [HttpGet("{clanId}")]
        public async Task<ActionResult<IEnumerable<ChatMessageViewModel>>> GetHistory(string clanId)
        {
            if (string.IsNullOrWhiteSpace(clanId))
                return BadRequest("Brak clanId.");

            var history = await _chatService.GetChatHistoryAsync(clanId);
            return Ok(history);
        }

        // POST /api/chatapi
        [HttpPost]
        public async Task<IActionResult> PostMessage([FromBody] ChatMessageInputDto dto)
        {
            if (dto == null
             || string.IsNullOrWhiteSpace(dto.ClanId)
             || string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Brak clanId lub message.");

            // Pobierz ID zalogowanego
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // 1) Zapisz w bazie
            await _chatService.AddMessageAsync(dto.ClanId, userId, dto.Message);

            // 2) Pobierz nick bezpośrednio z UserManager
            var user = await _userManager.FindByIdAsync(userId);
            var nick = user?.NickName ?? user?.UserName ?? "Unknown";

            // 3) Wyemituj przez SignalR
            await _hubContext
                .Clients
                .Group(dto.ClanId)
                .SendAsync("ReceiveMessage", nick, dto.Message);

            return NoContent();
        }

        [HttpGet("clans")]
        public async Task<ActionResult<IEnumerable<ClanDto>>> GetUserClans()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var clans = await _chatService.GetUserClansAsync(userId);
            return Ok(clans);
        }
    }
}
