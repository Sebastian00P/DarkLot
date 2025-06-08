using DarkLot.Dtos.LootlogDtos;
using DarkLot.Models.Lootlog;
using DarkLot.ViewModeles.LootLogViewModel;

namespace DarkLot.ApplicationServices.Lootlog
{
    public interface ILootlogService
    {
        Task<LootIndexViewModel> GetLatestLootsAsync(int count = 20);
        Task AddLootAsync(AddLootItemDto dto, string? creatorUserId);
    }
}
