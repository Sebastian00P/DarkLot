using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace DarkLot.ViewModeles.ClanViewModel
{
    public class AddMemberViewModel
    {
        [Required]
        public string ClanId { get; set; }

        [Required(ErrorMessage = "Podaj nick użytkownika")]
        [Display(Name = "Nick użytkownika")]
        public string Nickname { get; set; }

        // na razie tylko rola User
        public string Role { get; set; } = "User";
    }
}
