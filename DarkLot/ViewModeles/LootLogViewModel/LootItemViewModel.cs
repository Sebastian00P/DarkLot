namespace DarkLot.ViewModeles.LootLogViewModel
{
    public class LootItemViewModel
    {
        public DateTime CreationTime { get; set; }
        public string ServerName { get; set; }
        public string ClanName { get; set; }
        public string MapName { get; set; }
        public string MobName { get; set; }

        public List<LootUserViewModel> LootUsers { get; set; }
        public List<LootedItemViewModel> Items { get; set; }
    }
}
