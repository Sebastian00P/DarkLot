using DarkLot.Data;
using DarkLot.Models.Clans;
using DarkLot.Models.UserModel;
using DarkLot.ViewModeles.ClanViewModel;
using DarkLot.ViewModeles.PagedResultsViewModel;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.ApplicationServices.Clans
{
    public class ClanService : IClanService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ClanService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task CreateClanAsync(string name, string creatorUserId, string leaderUserId)
        {
            var nowLocal = DateTime.Now;

            var clan = new Clan
            {
                Id = Guid.NewGuid().ToString(),
                Name = name,
                CreationTime = nowLocal,
                IsActive = true,
                IsDeleted = false,
                CreatorUserId = creatorUserId
            };
            _context.Clans.Add(clan);
            await _context.SaveChangesAsync();

            var membership = new ClanMember
            {
                ClanId = clan.Id,
                UserId = leaderUserId,
                Role = "Admin",
                JoinedAt = nowLocal
            };
            _context.ClanMembers.Add(membership);
            await _context.SaveChangesAsync();
        }

        // Pobiera pojedynczy klan wraz z członkami
        public async Task<Clan> GetClanByIdAsync(string clanId)
        {
            var clan = await _context.Clans
                .Include(c => c.ClanMembers.OrderBy(x => x.JoinedAt))
                    .ThenInclude(cm => cm.User)
                .FirstOrDefaultAsync(c => c.Id == clanId && !c.IsDeleted);

            if (clan == null)
                throw new KeyNotFoundException($"Klan o Id={clanId} nie istnieje.");

            return clan;
        }

        // Pobiera wszystkie aktywne klany
        public async Task<IEnumerable<Clan>> GetAllClansAsync()
        {
            return await _context.Clans
                .Where(c => !c.IsDeleted)
                .ToListAsync();
        }

        // Aktualizuje podstawowe dane klanu
        public async Task UpdateClanAsync(Clan updatedClan)
        {
            var clan = await _context.Clans.FindAsync(updatedClan.Id);
            if (clan == null || clan.IsDeleted)
                throw new KeyNotFoundException($"Klan o Id={updatedClan.Id} nie istnieje.");

            clan.Name = updatedClan.Name;
            clan.IsActive = updatedClan.IsActive;
            // inne pola, jeśli potrzebne

            _context.Clans.Update(clan);
            await _context.SaveChangesAsync();
        }

        // Oznacza klan jako usunięty
        public async Task DeleteClanAsync(string clanId)
        {
            var clan = await _context.Clans.FindAsync(clanId);
            if (clan == null || clan.IsDeleted)
                throw new KeyNotFoundException($"Klan o Id={clanId} nie istnieje.");

            clan.IsDeleted = true;
            clan.IsActive = false;

            _context.Clans.Update(clan);
            await _context.SaveChangesAsync();
        }

        // Dodaje użytkownika do klanu z rolą
        public async Task AddMemberAsync(string clanId, string userId, string role)
        {
            var clan = await _context.Clans.FindAsync(clanId);
            if (clan == null || clan.IsDeleted)
                throw new KeyNotFoundException($"Klan o Id={clanId} nie istnieje.");

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"Użytkownik o Id={userId} nie istnieje.");

            bool exists = await _context.ClanMembers
                .AnyAsync(cm => cm.ClanId == clanId && cm.UserId == userId);
            if (exists)
                throw new InvalidOperationException("Użytkownik jest już członkiem klanu.");

            var membership = new ClanMember
            {
                ClanId = clanId,
                UserId = userId,
                Role = role,
                JoinedAt = DateTime.UtcNow
            };

            _context.ClanMembers.Add(membership);
            await _context.SaveChangesAsync();
        }

        // Usuwa użytkownika z klanu
        public async Task RemoveMemberAsync(string clanId, string userId)
        {
            var membership = await _context.ClanMembers
                .FirstOrDefaultAsync(cm => cm.ClanId == clanId && cm.UserId == userId);

            if (membership == null)
                throw new KeyNotFoundException("Taki członek w klanie nie istnieje.");

            _context.ClanMembers.Remove(membership);
            await _context.SaveChangesAsync();
        }

        // Aktualizuje rolę istniejącego członka
        public async Task UpdateMemberRoleAsync(string clanId, string userId, string newRole)
        {
            var membership = await _context.ClanMembers
                .FirstOrDefaultAsync(cm => cm.ClanId == clanId && cm.UserId == userId);

            if (membership == null)
                throw new KeyNotFoundException("Taki członek w klanie nie istnieje.");

            membership.Role = newRole;
            _context.ClanMembers.Update(membership);
            await _context.SaveChangesAsync();
        }

        public async Task<PagedResult<Clan>> GetClansPagedAsync(int page, int pageSize)
        {
            var query = _context.Clans
                .Where(c => !c.IsDeleted)
                .Include(c => c.CreatorUser)
                .OrderByDescending(c => c.CreationTime);

            var total = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<Clan>
            {
                Items = items,
                TotalCount = total,
                PageSize = pageSize,
                CurrentPage = page,
                TotalPages = totalPages
            };
        }
        public async Task<CreateClanViewModel> GetCreateClanModelAsync()
        {
            // wszyscy użytkownicy
            var allUsers = await _userManager.Users.ToListAsync();

            // ci, którzy już są liderami (rola Admin)
            var takenLeaderIds = await _context.ClanMembers
                .Where(cm => cm.Role == "Admin")
                .Select(cm => cm.UserId)
                .ToListAsync();

            var vm = new CreateClanViewModel
            {
                Users = allUsers
                    .Where(u => !takenLeaderIds.Contains(u.Id))
                    .Select(u => new SelectListItem
                    {
                        Value = u.Id,
                        Text = u.NickName
                    })
                    .ToList()
            };
            return vm;
        }

        public async Task<AddMemberViewModel> GetAddMemberModelAsync(string clanId)
        {
            var allUsers = await _userManager.Users.ToListAsync();
            var taken = await _context.ClanMembers
                .Where(cm => cm.ClanId == clanId)
                .Select(cm => cm.UserId)
                .ToListAsync();

            return new AddMemberViewModel
            {
                ClanId = clanId,
                AvailableUsers = allUsers
                    .Where(u => !taken.Contains(u.Id))
                    .Select(u => new SelectListItem
                    {
                        Value = u.Id,
                        Text = u.NickName
                    })
                    .ToList()
            };
        }

        public async Task AddMemberToClanAsync(AddMemberViewModel vm)
        {
            var membership = new ClanMember
            {
                ClanId = vm.ClanId,
                UserId = vm.UserId,
                Role = vm.Role,
                JoinedAt = DateTime.UtcNow
            };
            _context.ClanMembers.Add(membership);
            await _context.SaveChangesAsync();
        }

    }
}
