using Microsoft.AspNetCore.Identity.UI.Services;

namespace DarkLot.ServiceRegistartor
{
    public class NoOpEmailSender : IEmailSender
    {
        public Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            // Tu możesz np. logować, co byłoby wysłane
            return Task.CompletedTask;
        }
    }
}
