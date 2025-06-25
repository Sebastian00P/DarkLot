using DarkLot.Models.Timer;

namespace DarkLot.ApplicationServices.Timers
{
    public interface ITimerService
    {
        /// <summary>
        /// Zapisuje kill moba dla każdego klanu, do którego należy user
        /// </summary>
        Task RecordMobKillAsync(string userId, string mobName, int level, string monsterType);

        /// <summary>
        /// Pobiera wszystkie aktywne timery dla danego klanu
        /// </summary>
        Task<IEnumerable<MobRespawnTimer>> GetActiveTimersForClanAsync(string clanId);

        /// <summary>
        /// Oznacza timer jako nieaktywny (po respie / timeoutcie)
        /// </summary>
        Task DeactivateTimerAsync(int timerId);
    }
}
