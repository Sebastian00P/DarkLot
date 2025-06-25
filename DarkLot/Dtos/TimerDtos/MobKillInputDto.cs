using System.ComponentModel.DataAnnotations;

namespace DarkLot.Dtos.TimerDtos
{
    public class MobKillInputDto
    {
        [Required] 
        public string MobName { get; set; }
        [Required] 
        public int Level { get; set; }
        [Required] 
        public string MonsterType { get; set; }
    }
}
