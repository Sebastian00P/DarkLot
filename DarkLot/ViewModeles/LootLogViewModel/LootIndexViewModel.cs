﻿namespace DarkLot.ViewModeles.LootLogViewModel
{
    public class LootIndexViewModel
    {
        public List<LootItemViewModel> Loots { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
        public bool FilterHeroic { get; set; }
        public bool FilterLegendary { get; set; }
    }
}
