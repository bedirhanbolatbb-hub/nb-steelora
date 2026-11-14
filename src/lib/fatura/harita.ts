/**
 * GİB belgeleri → sipariş numarası eşlemesi (13 Kas 2026; 14 Kas'ta is.ts'ten
 * ayrıldı, Trendyol'a yükleme de kullanıyor).
 *
 * Son `gun` günün her belgesinin ayrıntısı okunur ve notundaki sipariş
 * numaralarıyla eşlenir. Bir siparişi anan BÜTÜN belgeler tutulur (taslak,
 * imzalı, silinmiş, iptal): taslak açma "biri varsa açma" der, yükleme "tam
 * bir tane olmalı" der. Notunda iki sipariş geçen belge ikisine de yazılır;
 * böylece ikisine de yeni taslak açılmaz, yükleme de ikisinde durur.
 * Bir belgenin ayrıntısı okunamazsa hata fırlar: tur hiç iş yapmadan biter.
 */
import { belgeGetir, belgeleriListele, type GibOturum } from './gib'
import { nottakiSiparisler, type GibKaydi } from './eslesme'

const ES_ZAMANLI_OKUMA = 3
/** GİB'de geriye bakılan gün: siparişlerin 13 günü + taslağın gecikme payı. */
export const GIB_GUNU = 21

async function sinirli<T, R>(ogeler: T[], es: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const sonuc = new Array<R>(ogeler.length)
  let sira = 0
  await Promise.all(
    Array.from({ length: Math.min(es, ogeler.length) }, async () => {
      while (sira < ogeler.length) {
        const k = sira++
        sonuc[k] = await f(ogeler[k])
      }
    })
  )
  return sonuc
}

/** `bilinen` ETTN'ler yeniden okunmaz. */
export async function faturaHaritasi(
  oturum: GibOturum,
  gun: number,
  bilinen = new Set<string>()
): Promise<{ harita: Map<string, GibKaydi[]>; ettnler: Set<string> }> {
  const belgeler = (await belgeleriListele(oturum, gun)).filter((b) => !bilinen.has(b.ettn))
  const detaylar = await sinirli(belgeler, ES_ZAMANLI_OKUMA, (b) => belgeGetir(oturum, b.ettn))
  const harita = new Map<string, GibKaydi[]>()
  belgeler.forEach((b, i) => {
    const kayit: GibKaydi = {
      ettn: b.ettn,
      belge: b.belgeNumarasi,
      onay: b.onayDurumu,
      aliciVknTckn: b.aliciVknTckn,
      aliciUnvanAdSoyad: b.aliciUnvanAdSoyad,
      detay: detaylar[i],
    }
    for (const no of new Set(nottakiSiparisler(detaylar[i].not))) {
      const liste = harita.get(no)
      if (liste) liste.push(kayit)
      else harita.set(no, [kayit])
    }
  })
  return { harita, ettnler: new Set(belgeler.map((b) => b.ettn)) }
}
