using DarkLot.Dtos.BattleDtos;
using DarkLot.ViewModeles.BattlesViewModel;
using System.Threading.Tasks;

namespace DarkLot.ApplicationServices.FightView
{
    public interface IFightViewService
    {
        Task<int> AddBattleAsync(BattleDto battleDto, string creatorUserId);
        Task<BattlePagedResult> GetAllBattlesAsync(int page, int pageSize, string userId);
        Task<BattleViewModel> GetBattleByIdAsync(int battleId);
        Task<List<BattleViewModel>> GetBattlesByPlayerAsync(string playerName);
        Task DeleteBattleById(int battleId);
        Task<bool?> TogleBattleFavoriteState(int battleId, string userId);
        Task<bool?> TogleBattleSharedState(int battleId, string userId);
        Task<BattlePagedResult> GetAllFavoriteBattlesAsync(int page, int pageSize, string userId);
        Task<BattlePagedResult> GetAllSharedBattlesAsync(int page, int pageSize, string userId);
    }

}