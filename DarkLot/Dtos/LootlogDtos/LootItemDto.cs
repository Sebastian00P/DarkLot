using System.ComponentModel.DataAnnotations;

namespace DarkLot.Dtos.LootlogDtos
{
    public class LootItemDto
    {
        // Podstawowe informacje
        [Required]
        public string ServerName { get; set; }
        [Required]
        public string ClanName { get; set; }
        [Required]
        public string MapName { get; set; }
        [Required]
        public string MobName { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;

        // Gracze biorący udział
        public List<LootUserDto> LootUsers { get; set; } = new();

        // Itemki (tu najlepiej HTML, żeby backend nie musiał parsować)
        public List<LootedItemDto> Items { get; set; } = new();

        // Komentarze (opcjonalnie przy dodawaniu, zwykle nie wymagane)
        public List<LootCommentDto> Comments { get; set; } = new();
    }
}
