namespace DarkLot.Dtos.LootlogDtos
{
    public class AddLootItemDto
    {
        public DateTime CreationTime { get; set; }
        public string ServerName { get; set; }
        public string ClanName { get; set; }
        public string MapName { get; set; }
        public string MobName { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }

        public List<AddLootUserDto> LootUsers { get; set; }
        public List<AddLootedItemDto> Items { get; set; }
    }
}
