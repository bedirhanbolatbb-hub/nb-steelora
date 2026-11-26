import {
  aliciKopyala,
  aliciOzeti,
  girdiDenetimi,
  koddakiTarih,
  notMetni,
  notundaKodVar,
  trendyolaTaslak,
  tutarBol,
} from '../trendyolaFatura.ts'
import { nottakiSiparisler } from '../eslesme.ts'

/** Trendyol'a kesilecek fatura testleri (26 Kas 2026). Yanlış fatura asla: her şüphede taslak açılmaz. */
let gecen = 0
let kalan = 0
const esit = (ad: string, gorulen: unknown, beklenen: unknown) => {
  const tamam = JSON.stringify(gorulen) === JSON.stringify(beklenen)
  if (tamam) gecen++
  else {
    kalan++
    console.error(`✗ ${ad}\n   görülen:  ${JSON.stringify(gorulen)}\n   beklenen: ${JSON.stringify(beklenen)}`)
  }
}

// ── 1. Tutar bölme (kuruşu kuruşuna)
esit('22,97 / %20 → Trendyol ekranındaki 19,14 + 3,83', tutarBol(22.97, 20), { matrah: 19.14, kdv: 3.83, toplam: 22.97 })
esit('120 / %20 → 100 + 20', tutarBol(120, 20), { matrah: 100, kdv: 20, toplam: 120 })
esit('1.268,40 / %10', tutarBol(1268.4, 10), { matrah: 1153.09, kdv: 115.31, toplam: 1268.4 })
esit('0,01 / %20 bölünemez', tutarBol(0.01, 20), null)
esit('sıfır tutar yok', tutarBol(0, 20), null)
esit('eksi tutar yok', tutarBol(-5, 20), null)
esit('kuruştan küçük parça yok', tutarBol(22.975, 20), null)
esit('sayı olmayan tutar yok', tutarBol(Number('abc'), 20), null)
// Geniş tarama: 0,05–2.000 TL arası her bölünen tutarda matrah + KDV = toplam.
let bozuk = 0
for (let k = 5; k <= 200000; k += 7) {
  const b = tutarBol(k / 100, 20)
  if (b && Math.round((b.matrah + b.kdv) * 100) !== k) bozuk++
  if (b && Math.abs(Math.round(b.matrah * 20) / 100 - b.kdv) > 0.005) bozuk++
}
esit('geniş tarama: bölünen her tutar kuruşu kuruşuna tutar, KDV matrahın %20si', bozuk, 0)

// ── 2. Fatura kodu ve not
esit('kod tarihi: KRM_1181208_251126 → 25.11.2026', koddakiTarih('KRM_1181208_251126')?.toISOString().slice(0, 10), '2026-11-25')
esit('geçersiz gün', koddakiTarih('KRM_1181208_311126'), null)
esit('not metni', notMetni('KRM_1181208_251126', 22.97), 'Fatura Kodu: KRM_1181208_251126\nYALNIZ: YİRMİ İKİ TÜRK LİRASI DOKSAN YEDİ KURUŞ')
esit('notta kod bulunur (boşluk/harf farkı yok sayılır)', notundaKodVar('fatura kodu: krm_1181208_251126', 'KRM_1181208_251126'), true)
esit('başka kod eşleşmez', notundaKodVar('Fatura Kodu: KRM_1181208_241126', 'KRM_1181208_251126'), false)
esit('boş not eşleşmez', notundaKodVar(undefined, 'KRM_1181208_251126'), false)
// Sipariş eşlemesi bu belgeyi hiçbir siparişe bağlamamalı (otomatik fatura işi etkilenmesin).
esit('not sipariş numarası taşımaz', nottakiSiparisler(notMetni('KRM_1181208_251126', 22.97)), [])

// ── 3. Girdi denetimi
const g = { kod: 'KRM_1181208_251126', toplam: 22.97, oran: 20, kalem: 'Kupon Kullanımı veya Promosyon Nedeniyle Fatura Farkı' }
esit('geçerli girdi', girdiDenetimi(g).tamam, true)
esit('biçimsiz kod', girdiDenetimi({ ...g, kod: 'KRM-1181208' }).tamam, false)
esit('%0 bu yoldan kesilmez', girdiDenetimi({ ...g, oran: 0 }).tamam, false)
esit('%18 kabul edilmez', girdiDenetimi({ ...g, oran: 18 }).tamam, false)
esit('boş kalem', girdiDenetimi({ ...g, kalem: ' ' }).tamam, false)
esit('bölünemeyen tutar', girdiDenetimi({ ...g, toplam: 0.01 }).tamam, false)

// ── 4. Alıcı kaynak belgeden
const kaynak = {
  vknTckn: '1234567890',
  aliciUnvan: 'DSM GRUP DANIŞMANLIK İLETİŞİM VE SATIŞ TİCARET A.Ş. (TRENDYOL)',
  aliciAdi: '',
  aliciSoyadi: '',
  vergiDairesi: 'Boğaziçi Kurumlar',
  ulke: 'Türkiye',
  bulvarcaddesokak: 'Örnek Mah. Örnek Cad. No:1',
  mahalleSemtIlce: 'Sarıyer',
  sehir: 'İstanbul',
}
const a = aliciKopyala(kaynak, 'Onaylandı')
esit('alıcı kopyalanır', a.tamam, true)
esit('imzasız kaynak reddedilir', aliciKopyala(kaynak, 'Onaylanmadı').tamam, false)
esit('11 haneli alıcı reddedilir', aliciKopyala({ ...kaynak, vknTckn: '12345678901' }, 'Onaylandı').tamam, false)
esit('Trendyol olmayan alıcı reddedilir', aliciKopyala({ ...kaynak, aliciUnvan: 'BAŞKA A.Ş.' }, 'Onaylandı').tamam, false)
esit('vergi dairesi yoksa reddedilir', aliciKopyala({ ...kaynak, vergiDairesi: '' }, 'Onaylandı').tamam, false)
esit('adres yoksa reddedilir', aliciKopyala({ ...kaynak, bulvarcaddesokak: '' }, 'Onaylandı').tamam, false)
esit('kişi adı varsa reddedilir', aliciKopyala({ ...kaynak, aliciAdi: 'Ali' }, 'Onaylandı').tamam, false)
if (a.tamam) {
  esit('özet vergi numarasını maskeler', aliciOzeti(a.alici).vergiNo, '********90')

  // ── 5. Taslak
  const t = trendyolaTaslak(g, a.alici, { tarih: '26/11/2026', saat: '10:00:00' })
  if (!t.tamam) {
    esit('taslak hazırlanır', t, 'tamam')
  } else {
    const jp = t.jp as Record<string, unknown> & { malHizmetTable: Record<string, unknown>[] }
    const k = jp.malHizmetTable[0]
    esit('tip SATIS, TL', [jp.faturaTipi, jp.paraBirimi], ['SATIS', 'TRY'])
    esit('alıcı kaynak belgeyle aynı', [jp.vknTckn, jp.aliciUnvan, jp.vergiDairesi, jp.sehir], [kaynak.vknTckn, kaynak.aliciUnvan, kaynak.vergiDairesi, kaynak.sehir])
    esit('tek kalem, 1 adet', [jp.malHizmetTable.length, k.miktar, k.birim], [1, 1, 'C62'])
    esit('kalem tutarları', [k.birimFiyat, k.fiyat, k.malHizmetTutari, k.kdvOrani, k.kdvTutari], ['19.14', '19.14', '19.14', '20', '3.83'])
    esit('toplamlar', [jp.matrah, jp.hesaplanankdv, jp.vergilerDahilToplamTutar, jp.odenecekTutar], ['19.14', '3.83', '22.97', '22.97'])
    esit('not', jp.not, notMetni(g.kod, 22.97))
    esit('ETTN boş gider (GİB üretir)', jp.faturaUuid, '')
  }
}

console.log(`\n  ${gecen} geçti, ${kalan} kaldı`)
process.exit(kalan ? 1 : 0)
