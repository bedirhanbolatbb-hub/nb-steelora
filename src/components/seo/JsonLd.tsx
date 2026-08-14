/**
 * JSON-LD blok basar. Sunucu bileşenidir: çıktı HTML'e gömülür, istemciye
 * hiç JS gitmez.
 *
 * JSON.stringify çıktısındaki "<" karakteri kaçırılır — aksi hâlde veri
 * içindeki bir "</script>" dizisi script etiketini erkenden kapatabilir.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
