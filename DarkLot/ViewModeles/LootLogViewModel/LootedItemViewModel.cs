namespace DarkLot.ViewModeles.LootLogViewModel
{
    public class LootedItemViewModel
    {
        public string ItemImgUrl { get; set; }
        /// <summary>
        /// Pełen JSON obiektu item (parsed.item) – trafia potem do atrybutu tip
        /// </summary>
        public string TipJson { get; set; }
    }
}
