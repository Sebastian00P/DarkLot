namespace DarkLot.Models.Lootlog
{
    public class LootComment
    {
        public int Id { get; set; }
        public int LootItemId { get; set; }
        public virtual LootItem LootItem { get; set; }

        public DateTime CreationTime { get; set; }
        public string Author { get; set; }
        public string Content { get; set; }
    }
}
