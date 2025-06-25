using Microsoft.AspNetCore.Mvc.Rendering;

namespace DarkLot.ViewModeles.TimerViewModel
{
    public class TimersIndexViewModel
    {
        public IEnumerable<SelectListItem> Clans { get; set; }
        public string ActiveClanId { get; set; }
        public List<TimerViewModel> Timers { get; set; }
    }
}
