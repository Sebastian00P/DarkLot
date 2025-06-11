namespace DarkLot.ViewModeles.BattlesViewModel
{
    public class BattlesListViewModel
    {
        public List<BattleViewModel> Battles { get; set; } = new();
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
    }
}
