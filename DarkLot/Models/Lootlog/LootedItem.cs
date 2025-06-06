namespace DarkLot.Models.Lootlog
{
    public class LootedItem
    {
        public int Id { get; set; }
        public int LootItemId { get; set; }
        public virtual LootItem LootItem { get; set; }

        public string ItemHtml { get; set; }
    }
}
