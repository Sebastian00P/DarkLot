using DarkLot.Data;
using DarkLot.Dtos.BattleDtos;
using DarkLot.Models.Battles;

namespace DarkLot.ApplicationServices.FightView
{
    public class FightViewService : IFightViewService
    {
        private readonly ApplicationDbContext _context;

        public FightViewService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<int> AddBattleAsync(BattleDto battleDto)
        {
            DateTime polandTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time"));

            var battle = new Battle
            {
                BattleStart = battleDto.BattleStart,
                CreationTime = polandTime,
                IsActive = true,
                IsDeleted = false,
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
    }
}
