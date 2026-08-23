import { NextResponse } from 'next/server'
import { gzipSync } from 'zlib'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Haftalık veritabanı yedeği (Faz 19).
 *
 * Supabase Free planda otomatik yedek YOK: sipariş, müşteri, adres ve kampanya
 * verisi tek kopya hâlinde duruyor. Yanlış bir DELETE ya da bir migration
 * kazası geri alınamaz. Bu uç, tüm tabloların tam JSON dökümünü alıp gzip'ler
 * ve Supabase Storage'daki PRIVATE `backups` bucket'ına yazar.
 *
 * TABLO LİSTESİ ELLE YAZILMAZ: PostgREST'in OpenAPI kökünden çalışma anında
 * keşfedilir. Yarın eklenen bir tablo, kod değişmeden yedeğe girer — elle
 * tutulan bir liste er geç bayatlar ve en çok ihtiyaç duyulan anda bir
 * tablonun eksik olduğu fark edilir.
 *
 * BUCKET PRIVATE OLMAK ZORUNDA: dökümde e-posta, açık adres, telefon ve
 * T.C. kimlik numarası var. Mevcut `media` bucket'ı public; yedek aynı
 * desende açılırsa tahmin edilebilir bir URL ile kimlik verisi internete
 * açılırdı. İndirme yalnız imzalı (süreli) URL ile yapılır.
 */

const BUCKET = 'backups'
const SAKLANAN_HAFTA = 8
const SAYFA = 1000

function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || ''
  const adminToken = cookieHeader.match(/admin_token=([^;]+)/)?.[1]
  const secret = process.env.ADMIN_SECRET_TOKEN
  return Boolean(secret) && adminToken === secret
}

/** PostgREST OpenAPI kökünden tablo adları (RPC'ler ve view'lar hariç). */
async function tablolariKesfet(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Şema okunamadı: HTTP ${res.status}`)
  const sema: any = await res.json()

  return Object.keys(sema.paths ?? {})
    .filter((yol) => yol.startsWith('/') && yol.length > 1)
    .map((yol) => yol.slice(1))
    // RPC'ler /rpc/ ile başlar; alt yolu olanlar tablo değil.
    .filter((ad) => !ad.startsWith('rpc/') && !ad.includes('/'))
    // products_display bir VIEW: products'tan türüyor, yedekte yer kaplamasın.
    .filter((ad) => ad !== 'products_display')
    .sort()
}

/** Bir tablonun tamamı — 1000'lik sayfalarla. */
async function tabloyuDok(
  supabase: ReturnType<typeof createServiceClient>,
  tablo: string
): Promise<any[]> {
  const satirlar: any[] = []
  for (let bas = 0; ; bas += SAYFA) {
    const { data, error } = await supabase.from(tablo).select('*').range(bas, bas + SAYFA - 1)
    if (error) throw new Error(`${tablo}: ${error.message}`)
    satirlar.push(...(data ?? []))
    if (!data || data.length < SAYFA) break
  }
  return satirlar
}

/** 8 haftadan eski yedekleri siler. */
async function eskileriTemizle(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 200,
    sortBy: { column: 'name', order: 'desc' },
  })
  if (error || !data) return []

  const yedekler = data.filter((d) => d.name.endsWith('.json.gz'))
  const silinecek = yedekler.slice(SAKLANAN_HAFTA).map((d) => d.name)
  if (silinecek.length > 0) await supabase.storage.from(BUCKET).remove(silinecek)
  return silinecek
}

async function yedekAl() {
  const baslangic = Date.now()
  const supabase = createServiceClient()

  const tablolar = await tablolariKesfet()
  const dokum: Record<string, any[]> = {}
  const sayimlar: Record<string, number> = {}
  const hatalar: Record<string, string> = {}

  for (const tablo of tablolar) {
    try {
      const satirlar = await tabloyuDok(supabase, tablo)
      dokum[tablo] = satirlar
      sayimlar[tablo] = satirlar.length
    } catch (e: any) {
      // Bir tablo okunamazsa yedeğin tamamı çöpe gitmesin; eksik olan
      // rapora ve dosyanın içine yazılır.
      hatalar[tablo] = e?.message ?? 'bilinmeyen hata'
    }
  }

  const uretildi = new Date()
  const govde = {
    uretildi: uretildi.toISOString(),
    kaynak: process.env.NEXT_PUBLIC_SUPABASE_URL,
    surum: 1,
    tablo_sayisi: Object.keys(dokum).length,
    satir_sayilari: sayimlar,
    okunamayan_tablolar: hatalar,
    veri: dokum,
  }

  const ham = Buffer.from(JSON.stringify(govde), 'utf-8')
  const sikistirilmis = gzipSync(ham, { level: 9 })
  const ad = `${uretildi.toISOString().slice(0, 10)}-${uretildi.getTime()}.json.gz`

  const { error: yuklemeHatasi } = await supabase.storage.from(BUCKET).upload(ad, sikistirilmis, {
    contentType: 'application/gzip',
    cacheControl: '0',
    upsert: false,
  })
  if (yuklemeHatasi) throw new Error(`Yedek yüklenemedi: ${yuklemeHatasi.message}`)

  const silinen = await eskileriTemizle(supabase)

  return {
    dosya: ad,
    tablolar: Object.keys(dokum).length,
    toplam_satir: Object.values(sayimlar).reduce((t, n) => t + n, 0),
    ham_bayt: ham.length,
    sikistirilmis_bayt: sikistirilmis.length,
    okunamayan_tablolar: hatalar,
    silinen_eski_yedekler: silinen,
    saklanan_hafta: SAKLANAN_HAFTA,
    sure_ms: Date.now() - baslangic,
  }
}

export async function GET(request: Request) {
  if (!isCronRequest(request) && !isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await yedekAl())
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** Panelden elle tetikleme. */
export async function POST(request: Request) {
  return GET(request)
}
