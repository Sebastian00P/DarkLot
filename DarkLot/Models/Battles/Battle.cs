using DarkLot.Models.UserModel;

namespace DarkLot.Models.Battles
{
    public class Battle
    {
        public int Id { get; set; }
        public string BattleStart { get; set; }

        public List<Fighter> Fighters { get; set; } = new List<Fighter>();

        public List<BattleLogEntry> Logs { get; set; } = new List<BattleLogEntry>();

        public DateTime CreationTime { get; set; }

        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public string CreatorUserId { get; set; } // Klucz obcy do ApplicationUser
        public virtual ApplicationUser CreatorUser { get; set; }
        public string ServerName { get; set; }
        public string UniqueHash { get; set; }


    }
}
