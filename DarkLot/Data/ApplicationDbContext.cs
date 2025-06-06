using DarkLot.Models.Lootlog;
using DarkLot.Models.UserModel;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DarkLot.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole, string>
    {

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<LootItem> LootItems { get; set; }
        public DbSet<LootUser> LootUsers { get; set; }
        public DbSet<LootedItem> LootedItems { get; set; }
        public DbSet<LootComment> LootComments { get; set; }

        // Dodatkowo, jeśli chcesz modelować relacje przez FluentAPI:
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<LootUser>()
                .HasOne(lu => lu.LootItem)
                .WithMany(li => li.LootUsers)
                .HasForeignKey(lu => lu.LootItemId);

            builder.Entity<LootItem>()
                .HasOne(li => li.CreatorUser)
                .WithMany()
                .HasForeignKey(li => li.CreatorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<LootComment>()
                .HasOne(lc => lc.LootItem)
                .WithMany(li => li.Comments)
                .HasForeignKey(lc => lc.LootItemId);
        }
    }
}
