using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DarkLot.Data.Migrations
{
    /// <inheritdoc />
    public partial class monsterType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MonsterType",
                table: "MobRespawnTimers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MonsterType",
                table: "MobRespawnTimers");
        }
    }
}
