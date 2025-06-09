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
    }
}
