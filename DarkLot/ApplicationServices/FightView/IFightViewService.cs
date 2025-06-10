using DarkLot.Dtos.BattleDtos;
using DarkLot.ViewModeles.BattlesViewModel;

namespace DarkLot.ApplicationServices.FightView
{
    public interface IFightViewService
    {
        Task<int> AddBattleAsync(BattleDto battleDto, string creatorUserId);
        Task<List<BattleViewModel>> GetAllBattlesAsync();
        Task<BattleViewModel> GetBattleByIdAsync(int battleId);
        Task<List<BattleViewModel>> GetBattlesByPlayerAsync(string playerName);
    }

}