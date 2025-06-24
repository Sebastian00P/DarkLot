using DarkLot.ApplicationServices.Chat;
using DarkLot.ApplicationServices.Clans;
using DarkLot.Models.UserModel;
using DarkLot.ViewModeles.ChatViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Security.Claims;

namespace DarkLot.Controllers
{
    [Authorize]
    public class ChatController : Controller
    {
        private readonly IClanService _clanService;
        private readonly IChatService _chatService;
        private readonly UserManager<ApplicationUser> _userManager;


        public ChatController(
         IClanService clanService,
         IChatService chatService,
         UserManager<ApplicationUser> userManager)
        {
            _clanService = clanService;
            _chatService = chatService;
            _userManager = userManager;
        }
        public async Task<IActionResult> Index(string clanId = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var clans = (await _clanService.GetClansForUserAsync(userId)).ToList();

            if (string.IsNullOrEmpty(clanId) && clans.Any())
                clanId = clans.First().Id;

            var vm = new ChatIndexViewModel
            {
                Clans = clans.Select(c => new SelectListItem
                {
                    Value = c.Id,
                    Text = c.Name,
                    Selected = c.Id == clanId
                }),
                ActiveClanId = clanId,
                CurrentUserNick = (await _userManager.GetUserAsync(User))?.NickName
            };

            if (!string.IsNullOrEmpty(clanId))
                vm.History = await _chatService.GetChatHistoryAsync(clanId);

            return View(vm);
        }
    }
}
