namespace DarkLot.ViewModeles.BattlesViewModel
{
    public class BattlePagedResult
    {
        public List<BattleViewModel> Battles { get; set; }
        public int TotalBattles { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
    }
}
