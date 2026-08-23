/**
 * Boş durum metinleri (Faz 21) — docs/marka-sesi.md.
 * Suçlayıcı değil, yol gösterici. Ünlem ve emoji yok.
 */
export const BOS_DURUM = {
  sepet: {
    baslik: 'Sepetiniz henüz boş',
    metin: 'Beğendiğiniz parçaları buraya ekleyebilirsiniz.',
    eylem: 'Koleksiyona göz atın',
  },
  favori: {
    baslik: 'Henüz favoriniz yok',
    metin: 'Beğendiğiniz parçaları kalp simgesiyle burada saklayabilirsiniz.',
    eylem: 'Koleksiyona göz atın',
  },
  arama: {
    baslik: 'Bu aramaya uygun ürün bulamadık',
    metin: 'Farklı bir kelime deneyebilir ya da kategorilere göz atabilirsiniz.',
    eylem: 'Tüm ürünler',
  },
  kategori: {
    baslik: 'Bu kategoride şu an ürün yok',
    metin: 'Koleksiyon düzenli olarak yenileniyor; kısa süre sonra tekrar bakabilirsiniz.',
    eylem: 'Tüm ürünler',
  },
  siparis: {
    baslik: 'Henüz siparişiniz yok',
    metin: 'İlk siparişinizi verdiğinizde burada görünecek.',
    eylem: 'Koleksiyona göz atın',
  },
} as const
