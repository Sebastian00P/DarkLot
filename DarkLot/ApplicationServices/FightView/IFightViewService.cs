using DarkLot.Dtos.BattleDtos;

namespace DarkLot.ApplicationServices.FightView
{
    public interface IFightViewService
    {
        Task<int> AddBattleAsync(BattleDto battleDto);
    }
}