import { yolOzeti, type Tarayici } from './tarayicilar'

/**
 * Tarayıcı ziyaretini günlük sayaç satırına yazar (24 Kas 2026).
 *
 * İstek katmanında (src/proxy.ts) çalışır ve YALNIZ kullanıcı aracısı listede
 * eşleşen isteklerde çağrılır; insan ziyaretçilerin isteği bu koda hiç
 * uğramaz. Yazım `waitUntil` ile yanıttan bağımsızdır: sayfa bekletilmez.
 *
 * Kişisel veri yok: IP ve kullanıcı aracısının kendisi yazılmaz; yalnız gün,
 * listedeki ad, grup ve sorgusuz adres.
 *
 * supabase-js bilerek kullanılmadı: istek katmanının paketi küçük kalsın
 * (aynı katman panel ve ödeme isteklerinde de çalışıyor). Tek bir REST
 * çağrısı: public.tarayici_ziyareti_yaz (docs/izleme/02-tarayici-ziyaretleri.sql).
 *
 * AÇIK BAŞARISIZ: tablo henüz kurulmadıysa, ağ düşerse ya da süre aşılırsa
 * hiçbir şey olmaz — sayaç hiçbir koşulda isteği etkilemez, günlüğe de
 * yazmaz (her tarayıcı isteğinde bir uyarı satırı günlüğü doldururdu).
 */
const ZAMAN_ASIMI_MS = 2500

export async function tarayiciZiyaretiYaz(tarayici: Tarayici, yol: string): Promise<void> {
  const taban = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!taban || !anahtar) return
  try {
    await fetch(`${taban}/rest/v1/rpc/tarayici_ziyareti_yaz`, {
      method: 'POST',
      headers: {
        apikey: anahtar,
        Authorization: `Bearer ${anahtar}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_tarayici: tarayici.ad,
        p_grup: tarayici.grup,
        p_yol: yolOzeti(yol, tarayici.grup),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    })
  } catch {
    // Bilerek boş: yukarıdaki nota bakınız.
  }
}
