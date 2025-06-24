using DarkLot.Models.UserModel;

namespace DarkLot.Models.Clans
{
    public class ClanMember
    {
        public string ClanId { get; set; }
        public virtual Clan Clan { get; set; }

        public string UserId { get; set; }
        public virtual ApplicationUser User { get; set; }

        public string Role { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
