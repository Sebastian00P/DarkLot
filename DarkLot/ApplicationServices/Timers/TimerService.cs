using DarkLot.ApplicationServices.Clans;
using DarkLot.Data;
using DarkLot.Models.Timer;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.ApplicationServices.Timers
{
    public class TimerService : ITimerService
    {
        private readonly ApplicationDbContext _context;
        private readonly IClanService _clanService;

        public TimerService(ApplicationDbContext context, IClanService clanService)
        {
            _context = context;
            _clanService = clanService;
        }

        public async Task RecordMobKillAsync(string userId, string mobName, int level, string monsterType)
        {
            var clans = await _clanService.GetClansForUserAsync(userId);

            foreach (var clan in clans)
            {
                var existing = await _context.MobRespawnTimers
                   .FirstOrDefaultAsync(t =>
                       t.ClanId == clan.Id &&
                       t.MobName == mobName
                   );

                if (existing != null)
                {
                    existing.KilledByUserId = userId;
                    existing.KilledAt = DateTime.UtcNow;
                }
                else
                {
                    var timer = new MobRespawnTimer
                    {
                        MobName = mobName,
                        Level = level,
                        MonsterType = monsterType,
                        KilledAt = DateTime.UtcNow,
                        IsActive = true,
                        IsDeleted = false,
                        KilledByUserId = userId,
                        ClanId = clan.Id
                    };
                    _context.MobRespawnTimers.Add(timer);
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<MobRespawnTimer>> GetActiveTimersForClanAsync(string clanId)
        {
            return await _context.MobRespawnTimers
                .Where(t => t.ClanId == clanId && t.IsActive && !t.IsDeleted)
                .Include(t => t.KilledByUser)
                .ToListAsync();
        }

        public async Task DeactivateTimerAsync(int timerId)
        {
            var timer = await _context.MobRespawnTimers.FindAsync(timerId);
            if (timer == null) return;
            timer.IsActive = false;
            await _context.SaveChangesAsync();
        }
    }
}
