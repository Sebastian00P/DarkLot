using DarkLot.Models.UserModel;

namespace DarkLot.Models.Lootlog
{
    public class LootItem
    {
        public int Id { get; set; }
        public DateTime CreationTime { get; set; }

        public string ServerName { get; set; }
        public string ClanName { get; set; }
        public string MapName { get; set; }
        public string MobName { get; set; }

        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }

        // --- Relacje ---
        public virtual List<LootUser> LootUsers { get; set; } = new();
        public virtual List<LootedItem> Items { get; set; } = new();
        public virtual List<LootComment> Comments { get; set; } = new();

        // --- Creator ---
        public string CreatorUserId { get; set; }  // Klucz obcy do ApplicationUser
        public virtual ApplicationUser CreatorUser { get; set; }
    }
}
