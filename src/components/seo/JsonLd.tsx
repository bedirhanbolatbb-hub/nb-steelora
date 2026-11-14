
/**
 * JSON-LD blok basar. Sunucu bileşenidir: çıktı HTML'e gömülür, istemciye
 * hiç JS gitmez.
 *
 * JSON.stringify çıktısındaki "<" karakteri kaçırılır — aksi hâlde veri
 * içindeki bir "</script>" dizisi script etiketini erkenden kapatabilir.
 *
 * Faz 27: CSP nonce'u eklendi. `application/ld+json` çalıştırılabilir bir
 * script değildir ama tarayıcılar onu `script-src` altında sayar; nonce
 * olmadan politika bu bloğu engeller ve yapılandırılmış veri kaybolur.
 * 14 Kas 2026: nonce kaldırıldı — bileşen yalnız önbellekten verilen vitrin
 * sayfalarında (sabit politika) kullanılıyor; application/ld+json zaten çalıştırılmaz.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
