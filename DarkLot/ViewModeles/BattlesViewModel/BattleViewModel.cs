using DarkLot.Dtos.BattleDtos;

namespace DarkLot.ViewModeles.BattlesViewModel
{
    public class BattleViewModel
    {
        public int Id { get; set; }
        public string BattleStart { get; set; }
        public List<FighterDto> Fighters { get; set; } = new();
        public List<BattleLogLineDto> Logs { get; set; } = new();
        public string ServerName { get; set; }
        public DateTime CreationTime { get; set; }
        public string CreatorUserId { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public string CreatorNickName { get; set; }
        public string WinnerName { get; set; }
    }
}
