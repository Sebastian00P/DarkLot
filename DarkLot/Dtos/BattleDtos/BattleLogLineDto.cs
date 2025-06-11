namespace DarkLot.Dtos.BattleDtos
{
    public class BattleLogLineDto
    {
        public string RawLine { get; set; } = ""; // oryginalna linia
        public string AttackerId { get; set; }
        public string DefenderId { get; set; }
        public string AttackerName { get; set; }
        public string DefenderName { get; set; }
        public int? SkillId { get; set; }
        public string SpellName { get; set; }
        public List<string> Effects { get; set; } = new();
        public string Text { get; set; } = "";
    }
}
