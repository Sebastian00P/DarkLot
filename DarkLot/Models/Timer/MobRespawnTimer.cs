using DarkLot.Models.Clans;
using DarkLot.Models.UserModel;

namespace DarkLot.Models.Timer
{
    public class MobRespawnTimer
    {
        public int Id { get; set; }
        public string MobName { get; set; }
        public int Level { get; set; }
        public string MonsterType { get; set; }

        public DateTime KilledAt { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }

        // --- Relacje ---
        // kto zabił
        public string KilledByUserId { get; set; }
        public virtual ApplicationUser KilledByUser { get; set; }

        // dla którego klanu (duplikujemy timer dla każdego klanu gracza)
        public string ClanId { get; set; }
        public virtual Clan Clan { get; set; }
    }
}
