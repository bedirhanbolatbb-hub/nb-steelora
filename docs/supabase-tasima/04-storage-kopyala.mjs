#!/usr/bin/env node
/**
 * NB Steelora — Supabase taşıma paketi · 04 STORAGE KOPYASI
 *
 * `media` bucket'ındaki tüm dosyaları eski projeden indirip yeni projeye
 * AYNI YOLLA yükler. Yollar birebir korunur, çünkü veritabanındaki bazı
 * kayıtlar (hero slaytı) tam URL saklıyor ve yalnız alan adı değişecek.
 *
 * ÇALIŞTIRMA:
 *   export ESKI_URL="https://npvanotrzbqsnxvasmxm.supabase.co"
 *   export ESKI_KEY="<eski service_role>"
 *   export YENI_URL="https://<yeni-ref>.supabase.co"
 *   export YENI_KEY="<yeni service_role>"
 *   node docs/supabase-tasima/04-storage-kopyala.mjs
 *
 * ÖN KOŞUL: yeni projede `media` bucket'ı PUBLIC olarak oluşturulmuş olmalı
 * (bkz. 06-bb-adimlari.md). Betik bucket'ı kendisi de oluşturmayı dener.
 */

const ESKI_URL = process.env.ESKI_URL
const ESKI_KEY = process.env.ESKI_KEY
const YENI_URL = process.env.YENI_URL
const YENI_KEY = process.env.YENI_KEY
const BUCKET = process.env.BUCKET || 'media'

if (!ESKI_URL || !ESKI_KEY || !YENI_URL || !YENI_KEY) {
  console.error('ESKI_URL, ESKI_KEY, YENI_URL, YENI_KEY tanımlı olmalı.')
  process.exit(1)
}

const basliklar = (key) => ({ apikey: key, Authorization: `Bearer ${key}` })

/** Bucket içindeki tüm dosyaları klasörleri gezerek toplar. */
async function tumDosyalar(prefix = '') {
  const res = await fetch(`${ESKI_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...basliklar(ESKI_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  })
  if (!res.ok) throw new Error(`liste hatası: ${res.status}`)
  const kayitlar = await res.json()

  const dosyalar = []
  for (const k of kayitlar) {
    const yol = prefix ? `${prefix}/${k.name}` : k.name
    // Klasörlerin metadata'sı boş gelir; içine iner.
    if (!k.id && !k.metadata) {
      dosyalar.push(...(await tumDosyalar(yol)))
    } else {
      dosyalar.push({ yol, boyut: k.metadata?.size ?? 0, tip: k.metadata?.mimetype ?? 'application/octet-stream' })
    }
  }
  return dosyalar
}

async function bucketOlustur() {
  const res = await fetch(`${YENI_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...basliklar(YENI_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 10485760,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  })
  const metin = await res.text()
  if (res.ok) console.log(`bucket "${BUCKET}" oluşturuldu (public, 10MB)`)
  else console.log(`bucket oluşturma: ${res.status} — ${metin.slice(0, 120)} (zaten varsa sorun değil)`)
}

console.log(`Storage kopyası — bucket: ${BUCKET}`)
await bucketOlustur()

const dosyalar = await tumDosyalar()
console.log(`Kaynakta ${dosyalar.length} dosya, toplam ${(dosyalar.reduce((t, d) => t + d.boyut, 0) / 1024).toFixed(1)} KB\n`)

let basarili = 0
let hatali = 0
for (const d of dosyalar) {
  try {
    const indir = await fetch(`${ESKI_URL}/storage/v1/object/${BUCKET}/${d.yol}`, { headers: basliklar(ESKI_KEY) })
    if (!indir.ok) throw new Error(`indirilemedi (${indir.status})`)
    const veri = Buffer.from(await indir.arrayBuffer())

    const yukle = await fetch(`${YENI_URL}/storage/v1/object/${BUCKET}/${d.yol}`, {
      method: 'POST',
      headers: {
        ...basliklar(YENI_KEY),
        'Content-Type': d.tip,
        'Cache-Control': '31536000',
        'x-upsert': 'true',
      },
      body: veri,
    })
    if (!yukle.ok) throw new Error(`yüklenemedi (${yukle.status}) ${(await yukle.text()).slice(0, 120)}`)

    basarili++
    console.log(`  ✓ ${d.yol} (${veri.length} bayt)`)
  } catch (e) {
    hatali++
    console.error(`  ✗ ${d.yol} — ${e.message}`)
  }
}

console.log(`\nBitti: ${basarili} başarılı, ${hatali} hatalı`)
console.log('Sonraki adım: 05-dogrulama.sql + hero slaytı URL güncellemesi (aşağıdaki SQL)')
console.log(`
-- Yeni projede çalıştırın (hero slaytındaki tam URL'yi yeni alan adına çevirir):
-- UPDATE public.homepage_settings
-- SET payload = replace(payload::text, 'npvanotrzbqsnxvasmxm.supabase.co', '<yeni-ref>.supabase.co')::jsonb
-- WHERE section = 'hero_slides' AND payload::text LIKE '%npvanotrzbqsnxvasmxm%';
`)
