namespace DarkLot.Dtos.BattleDtos
{
    public class BattleDto
    {
        public string BattleStart { get; set; }
        public List<FighterDto> Fighters { get; set; }
        public List<string> Logs { get; set; }
        public string ServerName { get; set; }
        //public DateTime CreationTime { get; set; }

        //public bool IsActive { get; set; }
        //public bool IsDeleted { get; set; }
        //public string CreatorUserId { get; set; }

    }
}
