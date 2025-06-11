using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DarkLot.Data.Migrations
{
    /// <inheritdoc />
    public partial class uniqhash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UniqueHash",
                table: "Battles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UniqueHash",
                table: "Battles");
        }
    }
}
