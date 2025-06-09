namespace DarkLot.Dtos.BattleDtos
{
    public class BattleDto
    {
        public string BattleStart { get; set; }
        public List<FighterDto> Fighters { get; set; }
        public List<string> Logs { get; set; }
    }
}
