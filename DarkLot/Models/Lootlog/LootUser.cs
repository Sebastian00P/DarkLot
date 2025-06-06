
namespace DarkLot.Models.Lootlog
{
    public class LootUser
    {
        public int Id { get; set; }
        public int LootItemId { get; set; }
        public virtual LootItem LootItem { get; set; }

        public string GameUserId { get; set; }      // id z gry (data-uid)
        public string Nick { get; set; }
        public int Level { get; set; }              // poziom (parse z data-tip)
        public string ClassAbbr { get; set; }       // np. "m" (mag), "w" (wojownik), jeśli chcesz
        public string AvatarUrl { get; set; }       // url do stroju/gracza (data-bg lub background-image)
    }
}
