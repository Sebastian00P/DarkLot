using DarkLot.ApplicationServices.Clans;
using DarkLot.Models.Clans;
using DarkLot.ViewModeles.ClanViewModel;
using DarkLot.ViewModeles.PagedResultsViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DarkLot.Controllers
{
    [Authorize]
    public class ClansController : Controller
    {
        private readonly IClanService _clanService;
        public ClansController(IClanService clanService)
        {
            _clanService = clanService;
        }

        public async Task<IActionResult> Index(int page = 1)
        {
            const int PageSize = 10;
            PagedResult<Clan> model = await _clanService.GetClansPagedAsync(page, PageSize);
            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> Create()
        {
            var vm = await _clanService.GetCreateClanModelAsync();
            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CreateClanViewModel vm)
        {
            if (!ModelState.IsValid)
            {
                var refill = await _clanService.GetCreateClanModelAsync();
                vm.Users = refill.Users;
                return View(vm);
            }

            var creatorId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            await _clanService.CreateClanAsync(vm.Name, creatorId, vm.LeaderUserId);
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public async Task<IActionResult> Members(string id)
        {
            if (string.IsNullOrEmpty(id))
                return BadRequest();

            var clan = await _clanService.GetClanByIdAsync(id);
            if (clan == null)
                return NotFound();

            return View(clan);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RemoveMember(string clanId, string userId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var clan = await _clanService.GetClanByIdAsync(clanId);
            if (clan.CreatorUserId != currentUserId) return Forbid();
            if (userId == clan.CreatorUserId) return BadRequest("Nie można usunąć dowódcy.");
            await _clanService.RemoveMemberAsync(clanId, userId);
            return RedirectToAction("Members", new { id = clanId });
        }

        // POST: /Clans/UpdateMemberRole
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateMemberRole(string clanId, string userId, string newRole)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var clan = await _clanService.GetClanByIdAsync(clanId);
            if (clan.CreatorUserId != currentUserId) return Forbid();
            if (userId == clan.CreatorUserId) return BadRequest("Nie można zmieniać roli dowódcy.");
            await _clanService.UpdateMemberRoleAsync(clanId, userId, newRole);
            return RedirectToAction("Members", new { id = clanId });
        }

        // GET: /Clans/AddMember?clanId=xxx
        public async Task<IActionResult> AddMember(string clanId)
        {
            var clan = await _clanService.GetClanByIdAsync(clanId);
            if (clan == null) return NotFound();

            // tylko dowódca
            var current = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (clan.CreatorUserId != current) return Forbid();

            var vm = await _clanService.GetAddMemberModelAsync(clanId);
            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddMember(AddMemberViewModel vm)
        {
            var clan = await _clanService.GetClanByIdAsync(vm.ClanId);
            if (clan.CreatorUserId != User.FindFirstValue(ClaimTypes.NameIdentifier))
                return Forbid();

            if (!ModelState.IsValid)
            {
                var refill = await _clanService.GetAddMemberModelAsync(vm.ClanId);
                refill.UserId = vm.UserId;
                return View(refill);
            }

            await _clanService.AddMemberToClanAsync(vm);
            return RedirectToAction("Members", new { id = vm.ClanId });
        }
    }
}
