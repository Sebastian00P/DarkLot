using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DarkLot.Data.Migrations
{
    /// <inheritdoc />
    public partial class lootlog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LootItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ServerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ClanName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MapName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MobName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatorUserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LootItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LootItems_AspNetUsers_CreatorUserId",
                        column: x => x.CreatorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LootComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LootItemId = table.Column<int>(type: "int", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Author = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LootComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LootComments_LootItems_LootItemId",
                        column: x => x.LootItemId,
                        principalTable: "LootItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LootedItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LootItemId = table.Column<int>(type: "int", nullable: false),
                    ItemHtml = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LootedItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LootedItems_LootItems_LootItemId",
                        column: x => x.LootItemId,
                        principalTable: "LootItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LootUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LootItemId = table.Column<int>(type: "int", nullable: false),
                    GameUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Nick = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    ClassAbbr = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LootUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LootUsers_LootItems_LootItemId",
                        column: x => x.LootItemId,
                        principalTable: "LootItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LootComments_LootItemId",
                table: "LootComments",
                column: "LootItemId");

            migrationBuilder.CreateIndex(
                name: "IX_LootedItems_LootItemId",
                table: "LootedItems",
                column: "LootItemId");

            migrationBuilder.CreateIndex(
                name: "IX_LootItems_CreatorUserId",
                table: "LootItems",
                column: "CreatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LootUsers_LootItemId",
                table: "LootUsers",
                column: "LootItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LootComments");

            migrationBuilder.DropTable(
                name: "LootedItems");

            migrationBuilder.DropTable(
                name: "LootUsers");

            migrationBuilder.DropTable(
                name: "LootItems");
        }
    }
}
