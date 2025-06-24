using DarkLot.Models.UserModel;

namespace DarkLot.Models.Clans
{
    public class Clan
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public DateTime CreationTime { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }

        // --- Creator ---
        public string CreatorUserId { get; set; }
        public virtual ApplicationUser CreatorUser { get; set; }

        public virtual ICollection<ClanMember> ClanMembers { get; set; } = new List<ClanMember>();
    }
}
