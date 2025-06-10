using DarkLot.Data;
using DarkLot.Dtos.BattleDtos;
using DarkLot.Models.Battles;
using DarkLot.ViewModeles.BattlesViewModel;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.ApplicationServices.FightView
{
    public class FightViewService : IFightViewService
    {
        private readonly ApplicationDbContext _context;

        public FightViewService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<int> AddBattleAsync(BattleDto battleDto, string creatorUserId)
        {
            DateTime polandTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time"));

            var battle = new Battle
            {
                BattleStart = battleDto.BattleStart,
                CreationTime = polandTime,
                IsActive = true,
                IsDeleted = false,
                CreatorUserId = creatorUserId,
                ServerName = battleDto.ServerName,
                Fighters = battleDto.Fighters?.Select(f => new Fighter
                {
                    FighterId = f.FighterId,
                    Name = f.Name,
                    Profession = f.Profession,
                    Team = f.Team
                }).ToList() ?? new List<Fighter>(),
                Logs = battleDto.Logs?.Select(l => new BattleLogEntry
                {
                    LogLine = l
                }).ToList() ?? new List<BattleLogEntry>()
            };

            _context.Battles.Add(battle);
            await _context.SaveChangesAsync();
            return battle.Id;
        }

        public async Task<List<BattleViewModel>> GetAllBattlesAsync()
        {
            return await _context.Battles
                .Where(b => !b.IsDeleted)
                .Select(b => new BattleViewModel
                {
                    BattleStart = b.BattleStart,
                    Fighters = b.Fighters.Select(f => new FighterDto
                    {
                        FighterId = f.FighterId,
                        Name = f.Name,
                        Profession = f.Profession,
                        Team = f.Team
                    }).ToList(),
                    Logs = b.Logs.Select(l => l.LogLine).ToList(),
                    ServerName = b.ServerName,
                    CreationTime = b.CreationTime,
                    CreatorUserId = b.CreatorUserId,
                    IsActive = b.IsActive,
                    IsDeleted = b.IsDeleted,
                    Id = b.Id
                }).OrderByDescending(x => x.CreationTime)
                .ToListAsync();
        }
        public async Task<BattleViewModel> GetBattleByIdAsync(int battleId)
        {
            return await _context.Battles
                .Where(b => b.Id == battleId && !b.IsDeleted)
                .Select(b => new BattleViewModel
                {
                    Id = b.Id,
                    BattleStart = b.BattleStart,
                    Fighters = b.Fighters.Select(f => new FighterDto
                    {
                        FighterId = f.FighterId,
                        Name = f.Name,
                        Profession = f.Profession,
                        Team = f.Team
                    }).ToList(),
                    Logs = b.Logs.Select(l => l.LogLine).ToList(),
                    ServerName = b.ServerName,
                    CreationTime = b.CreationTime,
                    CreatorUserId = b.CreatorUserId,
                    IsActive = b.IsActive,
                    IsDeleted = b.IsDeleted
                })
                .FirstOrDefaultAsync();
        }
        public async Task<List<BattleViewModel>> GetBattlesByPlayerAsync(string playerName)
        {
            return await _context.Battles
                .Where(b => !b.IsDeleted && b.Fighters.Any(f => f.Name == playerName))
                .Select(b => new BattleViewModel
                {
                    Id = b.Id,
                    BattleStart = b.BattleStart,
                    Fighters = b.Fighters.Select(f => new FighterDto
                    {
                        FighterId = f.FighterId,
                        Name = f.Name,
                        Profession = f.Profession,
                        Team = f.Team
                    }).ToList(),
                    Logs = b.Logs.Select(l => l.LogLine).ToList(),
                    ServerName = b.ServerName,
                    CreationTime = b.CreationTime,
                    CreatorUserId = b.CreatorUserId,
                    IsActive = b.IsActive,
                    IsDeleted = b.IsDeleted
                })
                .OrderByDescending(x => x.CreationTime)
                .ToListAsync();
        }
    }
}
