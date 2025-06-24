using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace DarkLot.ViewModeles.ClanViewModel
{
    public class CreateClanViewModel
    {
        [Required(
            ErrorMessage = "Pole „Nazwa klanu” jest wymagane.")]
        [StringLength(100)]
        [Display(Name = "Nazwa klanu")]
        public string Name { get; set; }

        [Required(
            ErrorMessage = "Musisz wybrać dowódcę klanu.")]
        [Display(Name = "Dowódca klanu")]
        public string LeaderUserId { get; set; }

        public IEnumerable<SelectListItem> Users { get; set; }
            = new List<SelectListItem>();
    }
}
