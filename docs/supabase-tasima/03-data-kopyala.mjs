#!/usr/bin/env node
/**
 * NB Steelora — Supabase taşıma paketi · 03 VERİ KOPYASI
 *
 * Eski projeden okur, yeni projeye yazar. Yabancı anahtar sırasına uyar,
 * sayfalama yapar (1000'lik parçalar), her tablodan sonra sayı raporlar.
 *
 * ÇALIŞTIRMA (anahtarlar ortamdan okunur, koda YAZILMAZ):
 *
 *   export ESKI_URL="https://npvanotrzbqsnxvasmxm.supabase.co"
 *   export ESKI_KEY="<eski projenin service_role anahtarı>"
 *   export YENI_URL="https://<yeni-ref>.supabase.co"
 *   export YENI_KEY="<yeni projenin service_role anahtarı>"
 *   node docs/supabase-tasima/03-data-kopyala.mjs
 *
 * Seçenekler:
 *   --dry            yalnız okur, yazmaz (sayıları gösterir)
 *   --only=tablo1,tablo2   yalnız belirtilen tabloları kopyalar
 *   --atla-analitik  analytics_* ve consent_logs tablolarını atlar
 *
 * NOT: user_id taşıyan tablolar (orders, user_profiles, user_addresses,
 * user_billing, wishlists, order_requests, reviews) auth.users'a bağlıdır.
 * Kullanıcı yeni projede YOKSA bu satırlar yabancı anahtar hatası verir —
 * önce 06-bb-adimlari.md'deki Auth adımını tamamlayın.
 */

const ESKI_URL = process.env.ESKI_URL
const ESKI_KEY = process.env.ESKI_KEY
const YENI_URL = process.env.YENI_URL
const YENI_KEY = process.env.YENI_KEY

const kuru = process.argv.includes('--dry')
const atlaAnalitik = process.argv.includes('--atla-analitik')
const yalniz = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '')
const yalnizSet = yalniz ? new Set(yalniz.split(',').map((s) => s.trim())) : null

if (!ESKI_URL || !ESKI_KEY || (!kuru && (!YENI_URL || !YENI_KEY))) {
  console.error('ESKI_URL, ESKI_KEY (ve --dry değilse YENI_URL, YENI_KEY) tanımlı olmalı.')
  process.exit(1)
}

/**
 * Kopyalama sırası — yabancı anahtar bağımlılıklarına göre.
 * `catisma`: upsert için benzersiz sütun(lar); yoksa düz insert.
 */
const TABLOLAR = [
  { ad: 'collections', catisma: 'id' },
  { ad: 'products', catisma: 'id' },
  { ad: 'campaigns', catisma: 'id' },
  { ad: 'site_content', catisma: 'key' },
  { ad: 'homepage_settings', catisma: 'id' },
  { ad: 'blog_posts', catisma: 'id' },
  { ad: 'sync_log', catisma: 'id' },
  { ad: 'carrier_regions', catisma: 'id' },
  { ad: 'newsletter_subscribers', catisma: 'id' },
  // auth.users'a bağlı olanlar
  { ad: 'user_profiles', catisma: 'id', authGerekli: true },
  { ad: 'user_addresses', catisma: 'id', authGerekli: true },
  { ad: 'user_billing', catisma: 'id', authGerekli: true },
  { ad: 'orders', catisma: 'id', authGerekli: true },
  { ad: 'order_requests', catisma: 'id', authGerekli: true },
  { ad: 'wishlists', catisma: 'id', authGerekli: true },
  { ad: 'reviews', catisma: 'id', authGerekli: true },
  // sipariş sonrası
  { ad: 'shipments', catisma: 'id' },
  { ad: 'shipment_events', catisma: 'id' },
  // analitik (istenirse atlanır — taşınması şart değil)
  { ad: 'analytics_events', catisma: 'id', analitik: true },
  { ad: 'analytics_daily', catisma: 'day', analitik: true },
  { ad: 'analytics_product_daily', catisma: 'day,product_id', analitik: true },
  { ad: 'consent_logs', catisma: 'id', analitik: true },
]

async function oku(tablo, bas, adim) {
  const res = await fetch(`${ESKI_URL}/rest/v1/${tablo}?select=*`, {
    headers: {
      apikey: ESKI_KEY,
      Authorization: `Bearer ${ESKI_KEY}`,
      Range: `${bas}-${bas + adim - 1}`,
      'Range-Unit': 'items',
    },
  })
  if (!res.ok) throw new Error(`${tablo} okunamadı: ${res.status} ${await res.text()}`)
  return res.json()
}

async function yaz(tablo, satirlar, catisma) {
  const res = await fetch(`${YENI_URL}/rest/v1/${tablo}`, {
    method: 'POST',
    headers: {
      apikey: YENI_KEY,
      Authorization: `Bearer ${YENI_KEY}`,
      'Content-Type': 'application/json',
      Prefer: `resolution=merge-duplicates,return=minimal`,
      ...(catisma ? { 'On-Conflict': catisma } : {}),
    },
    body: JSON.stringify(satirlar),
  })
  if (!res.ok) throw new Error(`${tablo} yazılamadı: ${res.status} ${(await res.text()).slice(0, 400)}`)
}

async function sayim(url, key, tablo) {
  const res = await fetch(`${url}/rest/v1/${tablo}?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = res.headers.get('content-range') || ''
  return Number(cr.split('/')[1] || 0)
}

console.log(kuru ? 'KURU ÇALIŞMA (yazma yok)\n' : 'VERİ KOPYASI BAŞLIYOR\n')

let toplamOkunan = 0
for (const t of TABLOLAR) {
  if (yalnizSet && !yalnizSet.has(t.ad)) continue
  if (atlaAnalitik && t.analitik) {
    console.log(`  ${t.ad.padEnd(24)} atlandı (--atla-analitik)`)
    continue
  }

  const adim = 1000
  let bas = 0
  let sayac = 0
  try {
    for (;;) {
      const parca = await oku(t.ad, bas, adim)
      if (parca.length === 0) break
      if (!kuru) await yaz(t.ad, parca, t.catisma)
      sayac += parca.length
      if (parca.length < adim) break
      bas += adim
    }
    toplamOkunan += sayac
    const hedef = kuru ? '—' : await sayim(YENI_URL, YENI_KEY, t.ad)
    const uyari = t.authGerekli && sayac > 0 && !kuru && hedef !== sayac ? '  ⚠ auth kullanıcısı eksik olabilir' : ''
    console.log(`  ${t.ad.padEnd(24)} kaynak ${String(sayac).padStart(5)} → hedef ${String(hedef).padStart(5)}${uyari}`)
  } catch (e) {
    console.error(`  ${t.ad.padEnd(24)} HATA: ${e.message}`)
  }
}

console.log(`\nToplam okunan satır: ${toplamOkunan}`)
console.log('Sonraki adım: 05-dogrulama.sql (yeni projede) ve 04-storage-copy.md')
