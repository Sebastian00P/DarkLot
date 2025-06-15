using DarkLot.Dtos.LootlogDtos;
using DarkLot.Models.Lootlog;
using DarkLot.ViewModeles.LootLogViewModel;

namespace DarkLot.ApplicationServices.Lootlog
{
    public interface ILootlogService
    {
        Task<LootIndexViewModel> GetLootsPageAsync(int page, int pageSize, bool filterHeroic, bool filterLegendary);
        Task AddLootAsync(AddLootItemDto dto, string? creatorUserId);
    }
}
