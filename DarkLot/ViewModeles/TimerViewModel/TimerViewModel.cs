namespace DarkLot.ViewModeles.TimerViewModel
{
    public class TimerViewModel
    {
        public int Id { get; set; }
        public string MobName { get; set; }
        public int Level { get; set; }
        public string MonsterType { get; set; }

        public DateTime KilledAt { get; set; }
        public DateTime RespawnTime { get; set; }
        public string Remaining { get; set; }
        public string KilledByNick { get; set; }

    }
}
