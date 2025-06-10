using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DarkLot.Data.Migrations
{
    /// <inheritdoc />
    public partial class fixBattleModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatorUserId",
                table: "Battles",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Battles_CreatorUserId",
                table: "Battles",
                column: "CreatorUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Battles_AspNetUsers_CreatorUserId",
                table: "Battles",
                column: "CreatorUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Battles_AspNetUsers_CreatorUserId",
                table: "Battles");

            migrationBuilder.DropIndex(
                name: "IX_Battles_CreatorUserId",
                table: "Battles");

            migrationBuilder.DropColumn(
                name: "CreatorUserId",
                table: "Battles");
        }
    }
}
