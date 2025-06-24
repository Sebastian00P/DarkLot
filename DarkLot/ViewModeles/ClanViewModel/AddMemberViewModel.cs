using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace DarkLot.ViewModeles.ClanViewModel
{
    public class AddMemberViewModel
    {
        [Required]
        public string ClanId { get; set; }

        [Required(ErrorMessage = "Wybierz użytkownika")]
        [Display(Name = "Użytkownik")]
        public string UserId { get; set; }

        // na razie tylko rola User
        public string Role { get; set; } = "User";

        public IEnumerable<SelectListItem> AvailableUsers { get; set; }
            = new List<SelectListItem>();
    }
}
