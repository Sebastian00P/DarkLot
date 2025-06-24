using DarkLot.Models.Clans;
using DarkLot.ViewModeles.ClanViewModel;
using DarkLot.ViewModeles.PagedResultsViewModel;

namespace DarkLot.ApplicationServices.Clans
{
    public interface IClanService
    {
        Task CreateClanAsync(string name, string creatorUserId, string leaderUserId);
        Task<Clan> GetClanByIdAsync(string clanId);
        Task<IEnumerable<Clan>> GetAllClansAsync();
        Task UpdateClanAsync(Clan updatedClan);
        Task DeleteClanAsync(string clanId);
        Task AddMemberAsync(string clanId, string userId, string role);
        Task RemoveMemberAsync(string clanId, string userId);
        Task UpdateMemberRoleAsync(string clanId, string userId, string newRole);
        Task<PagedResult<Clan>> GetClansPagedAsync(int page, int pageSize);
        Task<CreateClanViewModel> GetCreateClanModelAsync();
        Task<AddMemberViewModel> GetAddMemberModelAsync(string clanId);
        Task AddMemberToClanAsync(AddMemberViewModel vm);
    }
}