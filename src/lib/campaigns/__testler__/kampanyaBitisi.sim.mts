/**
 * Kampanya bitişi simülasyonu (Faz 19) — CANLI VERİYİ DEĞİŞTİRMEZ.
 *
 * "Kampanya bitince ne olacak?" sorusunu, kampanyayı gerçekten bitirmeden
 * cevaplar. Kampanya motorunun tamamı `simdi` parametresi taşıdığı için
 * geleceğe ait bir tarih verip aynı kod yollarını koşturmak yeterli:
 * DB'de `ends_at` oynatmaya gerek YOK.
 *
 * `ends_at` oynatmak neden reddedildi: vitrin sayfaları önbekleksiz ve
 * dinamik; UPDATE atıldığı saniye GERÇEK müşteriler indirimi kaybeder,
 * geri alınsa bile feed `s-maxage=3600` yüzünden bir saate kadar tutarsız
 * kalır. Simülasyon için o riski almaya gerek yok.
 *
 * Çalıştırma (depo kökünden):
 *   set -a; source .env.local; set +a
 *   node --experimental-strip-types src/lib/campaigns/__testler__/kampanyaBitisi.sim.mts
 *
 * Yeni bir kampanya bitmeden önce bunu koşturun: vitrin, besleme ve sepet
 * hesabının bitiş sonrası hâlini önceden görürsünüz.
 */

import { createClient } from '@supabase/supabase-js'
import { kampanyalariYukle } from '../yukle.ts'
import { sepetiDogrula } from '../sepetDogrula.ts'
import { sepetHesabi, kartFiyatiGosterilsinMi, kosulRozeti } from '../hesap.ts'

/**
 * sepetOzetiHesapla()'nın çekirdeği. O dosya doğrudan import edilemiyor
 * (uzantısız göreli import'ları Node ESM'de çözülmüyor); burada AYNI üç
 * fonksiyon aynı sırayla çağrılıyor — hesap gerçek motordan geliyor.
 */
async function sepetOzeti(params: { items: any[]; kod?: string | null; simdi: Date }) {
  const dogrulanmis = await sepetiDogrula(supabase as any, params.items)
  const { otomatikler, kodlular } = await kampanyalariYukle(supabase as any, params.simdi)
  const adaylar = [...otomatikler]
  let kodHatasi: string | null = null

  const temizKod = (params.kod ?? '').trim().toLocaleUpperCase('tr-TR')
  if (temizKod) {
    const { data: kodSatiri } = await supabase
      .from('campaigns').select('id, code').eq('is_active', true).ilike('code', temizKod).maybeSingle()
    const eslesen = kodSatiri ? kodlular.find((k: any) => k.id === kodSatiri.id) : null
    const zatenOtomatik = kodSatiri ? otomatikler.some((k: any) => k.id === kodSatiri.id) : false
    if (!eslesen && !zatenOtomatik) kodHatasi = 'Geçersiz ya da süresi dolmuş kod'
    else if (eslesen) adaylar.push(eslesen)
  }

  const ozet = sepetHesabi({ kalemler: dogrulanmis.kalemler, kampanyalar: adaylar, kargoTutari: 0 })
  return { ozet, kodHatasi }
}


const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** vitrinIndirimi.ts:37-54 mantığının birebir kopyası (o fonksiyon tarih parametresi almıyor). */
async function vitrinSimulasyonu(simdi: Date) {
  const { otomatikler } = await kampanyalariYukle(supabase, simdi)
  if (otomatikler.length === 0) return null
  const kosulsuz = otomatikler
    .filter((k: any) => kartFiyatiGosterilsinMi(k))
    .sort((a: any, b: any) => (Number(b.deger) || 0) - (Number(a.deger) || 0))[0]
  if (kosulsuz) return { ad: kosulsuz.ad, oran: Number(kosulsuz.deger) || null, rozet: null, fiyatGoster: true }
  for (const k of otomatikler) {
    const rozet = kosulRozeti(k as any)
    if (rozet) return { ad: k.ad, oran: null, rozet, fiyatGoster: false }
  }
  return null
}

/** feed.xml/route.ts:105-140 fiyat dallarının birebir kopyası. */
async function feedSimulasyonu(vitrin: any) {
  const { data } = await supabase
    .from('products_display')
    .select('slug, display_price, display_images, trendyol_stock')
    .limit(2000)
  const kalemler = (data ?? []).filter((p: any) => (p.display_images ?? []).length > 0 && Number(p.display_price) > 0)
  let salePriceli = 0
  for (const p of kalemler) {
    const liste = Number(p.display_price) || 0
    const indirimli = vitrin?.fiyatGoster && vitrin.oran ? Math.round(liste * (1 - vitrin.oran / 100) * 100) / 100 : null
    if (indirimli && indirimli < liste) salePriceli++
  }
  return { uygunKalem: kalemler.length, salePriceli }
}

const { data: urun } = await supabase
  .from('products_display')
  .select('id, display_price, display_title')
  .gt('display_price', 0)
  .limit(1)
  .single()
const sepet = [{ productId: urun!.id, quantity: 2 }]

async function olc(etiket: string, simdi: Date) {
  console.log(`\n${'='.repeat(72)}\n${etiket}  (simdi = ${simdi.toISOString()})\n${'='.repeat(72)}`)
  const { otomatikler, kodlular } = await kampanyalariYukle(supabase, simdi)
  console.log(`  yürürlükteki otomatik kampanya : ${otomatikler.length}  [${otomatikler.map((k: any) => k.ad.slice(0, 28)).join(' | ')}]`)
  console.log(`  yürürlükteki kodlu kampanya    : ${kodlular.length}  [${kodlular.map((k: any) => k.ad.slice(0, 28)).join(' | ')}]`)

  const vitrin = await vitrinSimulasyonu(simdi)
  console.log(`  (a) VİTRİN  → ${vitrin ? `${vitrin.ad.slice(0, 30)} · oran ${vitrin.oran} · fiyatGoster ${vitrin.fiyatGoster}` : 'null → üstü çizili fiyat YOK, rozet YOK'}`)

  const feed = await feedSimulasyonu(vitrin)
  console.log(`  (b) FEED    → ${feed.uygunKalem} uygun üründen ${feed.salePriceli} tanesinde g:sale_price`)

  const kodsuz = await sepetOzeti({ items: sepet, simdi })
  console.log(`  (d) SEPET (kodsuz)      → ara ${kodsuz.ozet.araToplam} · indirim ${kodsuz.ozet.indirimToplami} · toplam ${kodsuz.ozet.toplam}`)

  const hosgeldin = await sepetOzeti({ items: sepet, kod: 'HOSGELDIN10', simdi })
  console.log(`  (c) SEPET (HOSGELDIN10) → indirim ${hosgeldin.ozet.indirimToplami} · toplam ${hosgeldin.ozet.toplam} · hata: ${hosgeldin.kodHatasi ?? 'yok'}`)
  console.log(`      uygulanan: ${hosgeldin.ozet.uygulananlar.map((u: any) => `${u.ad.slice(0, 24)}=${u.tutar}`).join(', ') || '—'}`)

  const nb30 = await sepetOzeti({ items: sepet, kod: 'NB30', simdi })
  console.log(`      NB30 yazılırsa → indirim ${nb30.ozet.indirimToplami} · hata: ${nb30.kodHatasi ?? 'yok'}`)
}

console.log(`Sepet: 2 × "${urun!.display_title}" (${urun!.display_price} ₺)`)
await olc('BUGÜN (NB30 yürürlükte)', new Date())
await olc('1 EYLÜL 2026 (NB30 bitmiş)', new Date('2026-09-01T00:00:00+03:00'))
console.log('\nDB\'ye tek yazma yapılmadı; yalnız SELECT.')
