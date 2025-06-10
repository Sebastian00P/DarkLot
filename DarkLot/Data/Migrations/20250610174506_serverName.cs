using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DarkLot.Data.Migrations
{
    /// <inheritdoc />
    public partial class serverName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ServerName",
                table: "Battles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ServerName",
                table: "Battles");
        }
    }
}
