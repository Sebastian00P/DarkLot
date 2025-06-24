using DarkLot.Data;
using DarkLot.Models.ChatModel;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DarkLot.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;
        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task JoinClan(string clanId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, clanId);
        }

        public async Task LeaveClan(string clanId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, clanId);
        }

        public async Task SendMessage(string clanId, string nickname, string message)
        {
            var userId = Context.User.FindFirstValue(ClaimTypes.NameIdentifier);

            // 2. Utwórz i zapisz wiadomość
            var chatMessage = new ChatMessage
            {
                ClanId = clanId,
                UserId = userId,
                Text = message,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            // 3. Wyemituj do grupy
            await Clients.Group(clanId)
                .SendAsync("ReceiveMessage", nickname, message);
        }
    }
}
