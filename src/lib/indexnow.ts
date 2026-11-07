/**
 * IndexNow — Bing, Yandex, Seznam, Naver ve Yep'e "bu adres değişti" bildirimi.
 *
 * NEDEN (7 Kas 2026 ölçümü): Bing'in önbelleği sitenin haftalar önceki
 * metnini gösteriyordu. ChatGPT ve Copilot aramaları Bing dizinini kullanır;
 * Bing eski metni tuttukça yapay zekâ cevapları da eski bilgiyi tekrarlar.
 * Google IndexNow'u kullanmaz — Google için site haritası ve Search Console
 * yeterli, bu modül onlara dokunmaz.
 *
 * Anahtar GİZLİ DEĞİLDİR: protokol gereği /<anahtar>.txt adresinde herkese
 * açık yayınlanır (public/). Tek işlevi, bildirimin bu alan adının sahibinden
 * geldiğini kanıtlamaktır.
 *
 * Bildirim başarısız olursa hiçbir iş akışı durmaz: senkron, blog kaydı ve
 * panel işlemi sonucunu bildirime bağlamaz. Zaman aşımı 5 sn.
 */
import { SITE_URL } from './seo'

export const INDEXNOW_ANAHTARI = '69c0feecd4c2dbf622c0b44498119d09'

const UC_NOKTA = 'https://api.indexnow.org/indexnow'
/** Protokol tek istekte en fazla 10.000 adres kabul eder. */
const TEK_ISTEK_SINIRI = 10_000

export type IndexNowSonucu = {
  gonderilen: number
  /** 200/202 kabul; 4xx anahtar/adres sorunu; null → istek hiç ulaşmadı. */
  durum: number | null
  hata?: string
}

export async function indexNowBildir(adresler: (string | null | undefined)[]): Promise<IndexNowSonucu> {
  // Yalnız bu sitenin adresleri gider; başka alan adı 422 ile reddedilir.
  const tekil = [
    ...new Set(
      adresler
        .map((a) => (a ?? '').trim())
        .filter((a) => a === SITE_URL || a.startsWith(`${SITE_URL}/`))
    ),
  ].slice(0, TEK_ISTEK_SINIRI)

  if (tekil.length === 0) return { gonderilen: 0, durum: null }

  try {
    const yanit = await fetch(UC_NOKTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_ANAHTARI,
        keyLocation: `${SITE_URL}/${INDEXNOW_ANAHTARI}.txt`,
        urlList: tekil,
      }),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    return { gonderilen: tekil.length, durum: yanit.status }
  } catch (e) {
    return { gonderilen: 0, durum: null, hata: e instanceof Error ? e.message : 'bilinmeyen hata' }
  }
}
