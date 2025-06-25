using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DarkLot.Data.Migrations
{
    /// <inheritdoc />
    public partial class timers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MobRespawnTimers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MobName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    KilledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    KilledByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClanId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobRespawnTimers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MobRespawnTimers_AspNetUsers_KilledByUserId",
                        column: x => x.KilledByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MobRespawnTimers_Clans_ClanId",
                        column: x => x.ClanId,
                        principalTable: "Clans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MobRespawnTimers_ClanId",
                table: "MobRespawnTimers",
                column: "ClanId");

            migrationBuilder.CreateIndex(
                name: "IX_MobRespawnTimers_KilledByUserId",
                table: "MobRespawnTimers",
                column: "KilledByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MobRespawnTimers");
        }
    }
}
