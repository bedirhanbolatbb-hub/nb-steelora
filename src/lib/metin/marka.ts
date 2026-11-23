/**
 * Logonun altındaki tek satır — TEK KAYNAK (24 Kas 2026 tasarım denetimi).
 *
 * Eskiden "Fine Jewellery" yazıyordu. İki kusur ölçüldü:
 *  1) "Fine jewellery" altın/pırlanta gibi değerli maden mücevheri demektir;
 *     mağaza çelik ve kaplama pirinç takı satıyor. Sitenin kendi ürün sayfası
 *     "altın ya da gümüş değildir" derken logo aksini ima ediyordu.
 *  2) Sayfa dili Türkçe olduğu için büyük harfe çevrilirken "FİNE" diye
 *     noktalı İ ile basılıyordu.
 * Yeni satır, alt bilgideki kendi cümlemizle aynı: "çelik ve kaplama takı".
 * BB onayı: 24 Kas 2026.
 *
 * Büyük harfli hâli AYRI sabittir: CSS `uppercase` yerine yazının kendisi
 * büyük harflidir (e-posta ve paylaşım kartında CSS dili yok).
 */
export const MARKA_ALT_SATIR = 'Çelik ve Kaplama Takı'
export const MARKA_ALT_SATIR_BUYUK = 'ÇELİK VE KAPLAMA TAKI'
