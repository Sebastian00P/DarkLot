using Microsoft.AspNetCore.Mvc.Rendering;

namespace DarkLot.ViewModeles.ChatViewModel
{
    public class ChatIndexViewModel
    {
        public IEnumerable<SelectListItem> Clans { get; set; }
        public string ActiveClanId { get; set; }
        public IEnumerable<ChatMessageViewModel> History { get; set; }
        public string CurrentUserNick { get; set; }

    }
}
