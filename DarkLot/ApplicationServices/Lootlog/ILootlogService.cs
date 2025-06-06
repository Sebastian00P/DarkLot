using DarkLot.Dtos.LootlogDtos;
using DarkLot.Models.Lootlog;

namespace DarkLot.ApplicationServices.Lootlog
{
    public interface ILootlogService
    {
        Task<List<LootItem>> GetLatestLootsAsync(int count = 20);
        Task AddLootAsync(AddLootItemDto dto, string? creatorUserId);
    }
}
