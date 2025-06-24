using DarkLot.ApplicationServices.Clans;
using DarkLot.Data;
using DarkLot.Dtos.ChatDtos;
using DarkLot.Models.ChatModel;
using DarkLot.ViewModeles.ChatViewModel;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.ApplicationServices.Chat
{
    public class ChatService : IChatService
    {
        private readonly ApplicationDbContext _context;
        public ChatService(ApplicationDbContext context)
            => _context = context;
        public async Task<IEnumerable<ChatMessageViewModel>> GetChatHistoryAsync(string clanId, int take = 50)
        {
            return await _context.ChatMessages
               .Where(m => m.ClanId == clanId)
               .OrderByDescending(m => m.SentAt)
               .Take(take)
               .Select(m => new ChatMessageViewModel
               {
                   NickName = m.User.NickName,
                   Message = m.Text,
                   SentAt = m.SentAt
               })
               .ToListAsync();
        }

        public async Task AddMessageAsync(string clanId, string userId, string message)
        {
            var chatMessage = new ChatMessage
            {
                ClanId = clanId,
                UserId = userId,
                Text = message,
                SentAt = DateTime.UtcNow
            };
            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();
        }
        public async Task<IEnumerable<ClanDto>> GetUserClansAsync(string userId)
        {
            var clanIds = await _context.ClanMembers
                .Where(cm => cm.UserId == userId)
                .Select(cm => cm.ClanId)
                .ToListAsync();

            return await _context.Clans
                .Where(c => clanIds.Contains(c.Id) && !c.IsDeleted)
                .Select(c => new ClanDto
                {
                    Id = c.Id,
                    Name = c.Name
                })
                .ToListAsync();
        }
    }
}
