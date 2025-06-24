using DarkLot.Models.Clans;
using DarkLot.Models.UserModel;

namespace DarkLot.Models.ChatModel
{
    public class ChatMessage
    {
        public int Id { get; set; }

        // FK do klanu
        public string ClanId { get; set; }
        public virtual Clan Clan { get; set; }

        // FK do użytkownika
        public string UserId { get; set; }
        public virtual ApplicationUser User { get; set; }

        public string Text { get; set; }
        public DateTime SentAt { get; set; }
    }
}
