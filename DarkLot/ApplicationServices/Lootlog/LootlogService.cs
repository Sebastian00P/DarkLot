using DarkLot.Data;
using DarkLot.Dtos.LootlogDtos;
using DarkLot.Models.Lootlog;
using DarkLot.ViewModeles.LootLogViewModel;
using Humanizer;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.ApplicationServices.Lootlog
{
    public class LootlogService : ILootlogService
    {
        private readonly ApplicationDbContext _db;

        public LootlogService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<LootIndexViewModel> GetLatestLootsAsync(int count = 20)
        {
            var data = await _db.LootItems
                .Include(l => l.Items)
                .Include(l => l.LootUsers)
                .OrderByDescending(l => l.CreationTime)
                .Take(count)
                .ToListAsync();

            var vm = new LootIndexViewModel
            {
                Loots = data.Select(l => new LootItemViewModel
                {
                    CreationTime = l.CreationTime,
                    ServerName = l.ServerName,
                    ClanName = l.ClanName,
                    MapName = l.MapName,
                    MobName = l.MobName,

                    LootUsers = l.LootUsers.Select(u => new LootUserViewModel
                    {
                        GameUserId = u.GameUserId,
                        Nick = u.Nick,
                        Level = u.Level,
                        ClassAbbr = u.ClassAbbr,
                        AvatarUrl = u.AvatarUrl
                    }).ToList(),

                    Items = l.Items.Select(i => new LootedItemViewModel
                    {
                        ItemImgUrl = i.ItemImgUrl,
                        TipJson = i.ItemHtml
                    }).ToList()
                }).ToList()
            };

            return vm;
        }

        public async Task AddLootAsync(AddLootItemDto dto, string? creatorUserId)
        {
            var loot = new LootItem
            {
                ServerName = dto.ServerName,
                ClanName = dto.ClanName,
                MapName = dto.MapName,
                MobName = dto.MobName,
                IsActive = dto.IsActive,
                IsDeleted = dto.IsDeleted,
                CreatorUserId = creatorUserId,
                CreationTime = DateTime.UtcNow,
                LootUsers = dto.LootUsers?.Select(u => new LootUser
                {
                    GameUserId = u.GameUserId,
                    Nick = u.Nick,
                    Level = u.Level,
                    ClassAbbr = u.ClassAbbr,
                    AvatarUrl = u.AvatarUrl
                }).ToList() ?? new List<LootUser>(),
                Items = dto.Items?.Select(i => new LootedItem
                {
                    ItemHtml = i.ItemHtml,
                    ItemImgUrl = i.ItemImgUrl,
                }).ToList() ?? new List<LootedItem>(),
                Comments = new List<LootComment>() // zakładamy brak komentarzy przy dodawaniu lootu
            };

            _db.LootItems.Add(loot);
            await _db.SaveChangesAsync();
        }

    }
}
