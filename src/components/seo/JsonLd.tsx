import { headers } from 'next/headers'

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
 * Nonce'u proxy üretir ve `x-nonce` başlığıyla taşır.
 */
export default async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
