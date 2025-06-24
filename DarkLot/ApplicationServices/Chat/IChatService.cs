using DarkLot.Dtos.ChatDtos;
using DarkLot.ViewModeles.ChatViewModel;

namespace DarkLot.ApplicationServices.Chat
{
    public interface IChatService
    {
        Task<IEnumerable<ChatMessageViewModel>> GetChatHistoryAsync(string clanId, int take = 50);
        Task AddMessageAsync(string clanId, string userId, string message);
        Task<IEnumerable<ClanDto>> GetUserClansAsync(string userId);

    }
}