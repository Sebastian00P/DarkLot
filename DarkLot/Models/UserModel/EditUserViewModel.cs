using Microsoft.AspNetCore.Mvc.Rendering;

namespace DarkLot.Models.UserModel
{
    public class EditUserViewModel
    {
        public string Id { get; set; }
        public string Email { get; set; }
        public string UserName { get; set; }
        public string NickName { get; set; }
        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }

        public string SelectedRole { get; set; }
        public IEnumerable<SelectListItem> AvailableRoles { get; set; } = Enumerable.Empty<SelectListItem>();
    }
}
