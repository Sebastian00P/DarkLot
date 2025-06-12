using DarkLot.Data;
using DarkLot.Dtos.BattleDtos;
using DarkLot.Models.Battles;
using DarkLot.Models.UserModel;
using DarkLot.ViewModeles.BattlesViewModel;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.ApplicationServices.FightView
{
    public class FightViewService : IFightViewService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;


        public FightViewService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<int> AddBattleAsync(BattleDto battleDto, string creatorUserId)
        {
            DateTime polandTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time"));
            var uniqueHash = GenerateBattleHash(battleDto, creatorUserId);
            var alreadyExists = await _context.Battles.AnyAsync(b => b.UniqueHash == uniqueHash);
            if (alreadyExists)
            {
                return 0;
            }
            var battle = new Battle
            {
                BattleStart = battleDto.BattleStart,
                CreationTime = polandTime,
                IsActive = true,
                IsDeleted = false,
                CreatorUserId = creatorUserId,
                ServerName = battleDto.ServerName,
                UniqueHash = uniqueHash,
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

        public async Task<BattlePagedResult> GetAllBattlesAsync(int page, int pageSize)
        {
            var totalBattles = await _context.Battles.CountAsync(b => !b.IsDeleted);
            var totalPages = (int)Math.Ceiling(totalBattles / (double)pageSize);

            var battles = await _context.Battles
                .Where(b => !b.IsDeleted)
                .OrderByDescending(b => b.CreationTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.BattleStart,
                    Fighters = b.Fighters.Select(f => new FighterDto
                    {
                        FighterId = f.FighterId,
                        Name = f.Name,
                        Profession = f.Profession,
                        Team = f.Team
                    }).ToList(),

                    WinnerLogLine = b.Logs
                        .Where(l => !string.IsNullOrEmpty(l.LogLine) && l.LogLine.ToLower().Contains("winner="))
                        .OrderBy(l => l.Id)
                        .Select(l => l.LogLine)
                        .FirstOrDefault(),

                    b.ServerName,
                    b.CreationTime,
                    b.CreatorUserId,
                    b.IsActive,
                    b.IsDeleted
                })
                .ToListAsync();

            var result = new List<BattleViewModel>();

            foreach (var b in battles)
            {
                var user = await _userManager.FindByIdAsync(b.CreatorUserId);

                // wyciągnij nazwę zwycięzcy z WinnerLogLine
                string winnerName = null;
                if (!string.IsNullOrEmpty(b.WinnerLogLine))
                {
                    var idx = b.WinnerLogLine.IndexOf("winner=", StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0)
                    {
                        winnerName = b.WinnerLogLine.Substring(idx + "winner=".Length).Trim();
                    }
                }

                result.Add(new BattleViewModel
                {
                    Id = b.Id,
                    BattleStart = b.BattleStart,
                    Fighters = b.Fighters,
                    Logs = b.WinnerLogLine != null
                        ? new List<BattleLogLineDto> { new BattleLogLineDto { RawLine = b.WinnerLogLine } }
                        : new List<BattleLogLineDto>(),
                    ServerName = b.ServerName,
                    CreationTime = b.CreationTime,
                    CreatorUserId = b.CreatorUserId,
                    IsActive = b.IsActive,
                    IsDeleted = b.IsDeleted,
                    CreatorNickName = user?.NickName ?? "[Nieznany]",

                    WinnerName = winnerName
                });
            }

            return new BattlePagedResult
            {
                Battles = result,
                TotalBattles = totalBattles,
                TotalPages = totalPages,
                CurrentPage = page
            };
        }

        public async Task<BattleViewModel> GetBattleByIdAsync(int battleId)
        {
            var battle = await _context.Battles
                .Where(b => b.Id == battleId && !b.IsDeleted)
                .Select(b => new
                {
                    b.Id,
                    b.BattleStart,
                    Fighters = b.Fighters.Select(f => new FighterDto
                    {
                        FighterId = f.FighterId,
                        Name = f.Name,
                        Profession = f.Profession,
                        Team = f.Team
                    }).ToList(),
                    Logs = b.Logs.Select(l => l.LogLine).ToList(),
                    b.ServerName,
                    b.CreationTime,
                    b.CreatorUserId,
                    b.IsActive,
                    b.IsDeleted
                })
                .FirstOrDefaultAsync();

            if (battle == null)
                return null;

            // Mapa ID -> fighter name
            var fighterMap = battle.Fighters.ToDictionary(f => f.FighterId, f => f.Name);

            var parsedLogs = battle.Logs.Select(ParseBattleLogLine).ToList();

            // Uzupełnij imiona atakujących i broniących na podstawie ID
            foreach (var line in parsedLogs)
            {
                if (line.AttackerId != null && fighterMap.TryGetValue(line.AttackerId, out var attackerName))
                    line.AttackerName = attackerName;
                if (line.DefenderId != null && fighterMap.TryGetValue(line.DefenderId, out var defenderName))
                    line.DefenderName = defenderName;
            }

            return new BattleViewModel
            {
                Id = battle.Id,
                BattleStart = battle.BattleStart,
                Fighters = battle.Fighters,
                Logs = parsedLogs,
                ServerName = battle.ServerName,
                CreationTime = battle.CreationTime,
                CreatorUserId = battle.CreatorUserId,
                IsActive = battle.IsActive,
                IsDeleted = battle.IsDeleted
            };
        }

        /// <summary>
        /// Parsuje pojedynczą linijkę rawloga walki do BattleLogLineDto.
        /// </summary>
        private BattleLogLineDto ParseBattleLogLine(string rawLine)
        {
            var lineDto = new BattleLogLineDto { RawLine = rawLine };

            // Przykładowa linia: "775075=1;1276819=0;+wound;+pierce;+dmgd=9099;+acdmg=162"
            // lub "0;0;winner=yii"
            // lub "775075=1;1276819=5;tspell=Wyniszczające rany;skillId=96;+oth_dmg=2545, ,Firexus(5%);combo-max=1"

            var parts = rawLine.Split(';', StringSplitOptions.RemoveEmptyEntries);

            // Identyfikacja atakującego i obrońcy: dwa pierwsze elementy są najczęściej "attackerId=xxx" i "defenderId=xxx"
            // lub "0;0" jeśli brak
            if (parts.Length >= 2)
            {
                var first = parts[0];
                var second = parts[1];
                lineDto.AttackerId = first.Contains('=') ? first.Split('=')[0] : first;
                lineDto.DefenderId = second.Contains('=') ? second.Split('=')[0] : second;
            }

            // Przetwarzamy dalsze części linii
            for (int i = 2; i < parts.Length; i++)
            {
                var p = parts[i];
                if (p.StartsWith("tspell="))
                {
                    lineDto.SpellName = p.Substring(7);
                }
                else if (p.StartsWith("skillId="))
                {
                    if (int.TryParse(p.Substring(8), out int skillId))
                        lineDto.SkillId = skillId;
                }
                else if (p.StartsWith("+") || p.StartsWith("-"))
                {
                    lineDto.Effects.Add(p);
                }
                else if (p.StartsWith("txt="))
                {
                    lineDto.Text = p.Substring(4);
                }
                else if (p.Contains("="))
                {
                    // inne parametry - możesz rozbudować jeśli potrzeba
                    lineDto.Effects.Add(p);
                }
                else
                {
                    // Cokolwiek innego, traktuj jako tekst
                    lineDto.Text += (lineDto.Text.Length > 0 ? "; " : "") + p;
                }
            }

            return lineDto;
        }

        public async Task<List<BattleViewModel>> GetBattlesByPlayerAsync(string playerName)
        {
            var battles = await _context.Battles
                .Where(b => !b.IsDeleted && b.Fighters.Any(f => f.Name == playerName))
                .Select(b => new
                {
                    b.Id,
                    b.BattleStart,
                    Fighters = b.Fighters.Select(f => new FighterDto
                    {
                        FighterId = f.FighterId,
                        Name = f.Name,
                        Profession = f.Profession,
                        Team = f.Team
                    }).ToList(),
                    Logs = b.Logs.Select(l => l.LogLine).ToList(),
                    b.ServerName,
                    b.CreationTime,
                    b.CreatorUserId,
                    b.IsActive,
                    b.IsDeleted
                })
                .OrderByDescending(x => x.CreationTime)
                .ToListAsync();

            var result = new List<BattleViewModel>();

            foreach (var b in battles)
            {
                var fighterMap = b.Fighters.ToDictionary(f => f.FighterId, f => f.Name);

                var parsedLogs = b.Logs.Select(ParseBattleLogLine).ToList();

                foreach (var log in parsedLogs)
                {
                    if (log.AttackerId != null && fighterMap.TryGetValue(log.AttackerId, out var attackerName))
                        log.AttackerName = attackerName;
                    if (log.DefenderId != null && fighterMap.TryGetValue(log.DefenderId, out var defenderName))
                        log.DefenderName = defenderName;
                }

                result.Add(new BattleViewModel
                {
                    Id = b.Id,
                    BattleStart = b.BattleStart,
                    Fighters = b.Fighters,
                    Logs = parsedLogs,
                    ServerName = b.ServerName,
                    CreationTime = b.CreationTime,
                    CreatorUserId = b.CreatorUserId,
                    IsActive = b.IsActive,
                    IsDeleted = b.IsDeleted
                });
            }

            return result;
        }

        private string GenerateBattleHash(BattleDto battleDto, string creatorUserId)
        {
            var logConcat = string.Join(";", battleDto.Logs?.Take(3) ?? new List<string>());
            var baseString = $"{battleDto.BattleStart}|{string.Join(",", battleDto.Fighters.Select(f => f.FighterId + ":" + f.Name))}|{battleDto.ServerName}|{logConcat}|{creatorUserId}";
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                var bytes = System.Text.Encoding.UTF8.GetBytes(baseString);
                var hash = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

    }
}
