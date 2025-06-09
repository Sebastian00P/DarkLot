namespace DarkLot.Models.Battles
{
    public class Fighter
    {
        public int Id { get; set; }             // opcjonalnie, do bazy
        public int BattleId { get; set; }       // klucz obcy

        public string FighterId { get; set; }   // np. "775075"
        public string Name { get; set; }        // np. "yii"
        public string Profession { get; set; }  // np. "m"
        public int Team { get; set; }           // np. 1 lub 2
    }
}
