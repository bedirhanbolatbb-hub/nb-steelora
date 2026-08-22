import { createServiceClient } from '@/lib/supabase/service'
import { fetchStockAndPriceMap, updateTrendyolStock } from './client'
import { stokYazimModu, yazimAcik } from './stokYazimBayragi'

/**
 * Trendyol stok yazımının kuyruk katmanı (Faz 16B).
 *
 * DELTA İLKESİ: yazımdan hemen önce o barkodun CANLI Trendyol stoğu okunur ve
 * üstüne satılan/iade edilen adet uygulanır. Bizim DB'deki değer günde bir kez
 * senkronlandığı için bayattır; ondan hesaplanan MUTLAK stok, Trendyol'daki
 * gerçek stoğu ezip olmayan ürünü satışa açabiliyordu (keşifte ölçüldü).
 *
 * Ödeme akışı asla bloklanmaz: callback yalnız kuyruğa yazar, işleme ayrı
 * adımda yapılır ve her hata yutulur.
 *
 * Vercel Hobby planında dakikalık cron yok; bu yüzden kuyruk üç yerden işlenir:
 *   1) siparişten hemen sonra `after()` içinde,
 *   2) günlük senkron koşusunun sonunda (bekleyen kayıtlar),
 *   3) panelden "tekrar dene" düğmesiyle.
 */

export type KuyrukYonu = 'satis' | 'iade'

/** Yeniden deneme aralıkları — Trendyol'un "aynı gövde 15 dk" kuralına da uyar. */
const BEKLEME_DK = [1, 5, 15]
const AZAMI_DENEME = 3

type KuyrukSatiri = {
  id: string
  order_id: string | null
  item_index: number
  product_id: string | null
  barcode: string
  delta: number
  direction: KuyrukYonu
  attempts: number
}

/** Tablo henüz kurulmadıysa (migration çalıştırılmadıysa) sessizce geç. */
function tabloYok(hata: { code?: string; message?: string } | null): boolean {
  if (!hata) return false
  return hata.code === '42P01' || /relation .* does not exist/i.test(hata.message ?? '')
}

/**
 * Sipariş kalemlerini kuyruğa yazar. UNIQUE(order_id, item_index, direction)
 * sayesinde aynı kalem iki kez giremez — callback tekrar çalışsa da güvenli.
 */
export async function kuyrugaEkle(params: {
  orderId: string
  items: { productId: string | null; quantity: number }[]
  yon: KuyrukYonu
}): Promise<{ eklendi: number; hata?: string }> {
  const supabase = createServiceClient()

  try {
    const barkodlu: {
      order_id: string
      item_index: number
      product_id: string | null
      barcode: string
      delta: number
      direction: KuyrukYonu
    }[] = []

    for (let i = 0; i < params.items.length; i++) {
      const kalem = params.items[i]
      if (!kalem.productId) continue
      const adet = Math.max(1, Number(kalem.quantity) || 1)

      const { data: urun } = await supabase
        .from('products')
        .select('trendyol_barcode')
        .eq('id', kalem.productId)
        .maybeSingle()
      if (!urun?.trendyol_barcode) continue

      barkodlu.push({
        order_id: params.orderId,
        item_index: i,
        product_id: kalem.productId,
        barcode: urun.trendyol_barcode,
        delta: params.yon === 'iade' ? adet : -adet,
        direction: params.yon,
      })
    }

    if (barkodlu.length === 0) return { eklendi: 0 }

    const { error } = await supabase
      .from('stock_sync_queue')
      .upsert(barkodlu, { onConflict: 'order_id,item_index,direction', ignoreDuplicates: true })

    if (error) {
      if (tabloYok(error)) {
        console.warn('[stok-kuyruk] tablo yok — migration çalıştırılmamış, kuyruk atlandı')
        return { eklendi: 0, hata: 'tablo-yok' }
      }
      console.error('[stok-kuyruk] kuyruğa yazılamadı:', error.message)
      return { eklendi: 0, hata: error.message }
    }

    console.log(`[stok-kuyruk] ${barkodlu.length} kalem kuyruğa alındı · sipariş=${params.orderId}`)
    return { eklendi: barkodlu.length }
  } catch (hata: any) {
    console.error('[stok-kuyruk] beklenmeyen hata:', hata?.message)
    return { eklendi: 0, hata: hata?.message }
  }
}

/**
 * Bekleyen kayıtları işler. Aynı barkodun birden çok kaydı varsa deltalar
 * toplanır ve tek yazımda gönderilir; Trendyol'un "aynı gövde 15 dk" kuralına
 * takılmamak için de bu doğru davranış.
 */
export async function kuyrugaIsle(azami = 50): Promise<{
  islenen: number
  basarisiz: number
  atlandi: number
  mod: string
}> {
  const supabase = createServiceClient()
  const mod = stokYazimModu()
  const sonuc = { islenen: 0, basarisiz: 0, atlandi: 0, mod }

  const { data: bekleyenler, error } = await supabase
    .from('stock_sync_queue')
    .select('id, order_id, item_index, product_id, barcode, delta, direction, attempts')
    .eq('status', 'bekliyor')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(azami)

  if (error) {
    if (tabloYok(error)) return sonuc
    console.error('[stok-kuyruk] bekleyenler okunamadı:', error.message)
    return sonuc
  }
  if (!bekleyenler?.length) return sonuc

  // Barkod başına deltaları topla.
  const gruplar = new Map<string, { toplamDelta: number; satirlar: KuyrukSatiri[] }>()
  for (const satir of bekleyenler as KuyrukSatiri[]) {
    const g = gruplar.get(satir.barcode) ?? { toplamDelta: 0, satirlar: [] }
    g.toplamDelta += Number(satir.delta) || 0
    g.satirlar.push(satir)
    gruplar.set(satir.barcode, g)
  }

  // Canlı Trendyol stoğu — delta bunun üstüne uygulanır.
  let canliStok: Map<string, { quantity: number; salePrice: number }>
  try {
    canliStok = await fetchStockAndPriceMap([...gruplar.keys()])
  } catch (hata: any) {
    console.error('[stok-kuyruk] canlı stok okunamadı, kuyrukta bırakıldı:', hata?.message)
    for (const g of gruplar.values()) await ertele(supabase, g.satirlar, 'Canlı stok okunamadı')
    return { ...sonuc, basarisiz: bekleyenler.length }
  }

  for (const [barcode, grup] of gruplar) {
    const canli = canliStok.get(barcode)
    if (!canli) {
      // Barkod Trendyol'da bulunamadı: yazma, kuyrukta bırak.
      await ertele(supabase, grup.satirlar, 'Barkod Trendyol listesinde bulunamadı')
      sonuc.basarisiz += grup.satirlar.length
      continue
    }

    const hedef = canli.quantity + grup.toplamDelta
    const yazilacak = Math.max(0, hedef)
    const negatife_dustu = hedef < 0

    let batchId: string | null = null
    let hataMetni: string | null = null
    const gercektenYaz = yazimAcik(barcode)

    if (gercektenYaz) {
      try {
        const yanit = await updateTrendyolStock(barcode, yazilacak)
        batchId = yanit?.batchRequestId ?? null
      } catch (hata: any) {
        hataMetni = hata?.message ?? 'Trendyol yazımı başarısız'
      }
    } else {
      console.log(
        `[stok-kuyruk] ${mod} · YAZILMADI · ${barcode} · canlı=${canli.quantity} ` +
          `delta=${grup.toplamDelta} → yazılacaktı=${yazilacak}`
      )
    }

    await supabase.from('stock_sync_log').insert({
      barcode,
      product_id: grup.satirlar[0]?.product_id ?? null,
      mode: mod,
      previous_quantity: canli.quantity,
      written_quantity: yazilacak,
      delta: grup.toplamDelta,
      batch_request_id: batchId,
      item_status: gercektenYaz ? (hataMetni ? 'FAILED' : 'GONDERILDI') : 'GOLGE',
      error: hataMetni ?? (negatife_dustu ? 'Hesaplanan stok negatife düştü, 0 yazıldı' : null),
      queue_id: grup.satirlar[0]?.id ?? null,
    })

    if (hataMetni) {
      await ertele(supabase, grup.satirlar, hataMetni)
      sonuc.basarisiz += grup.satirlar.length
      continue
    }

    // Gölge/kapalı modda da kayıt "işlendi" sayılır: kuyruk şişmesin, log dursun.
    await supabase
      .from('stock_sync_queue')
      .update({
        status: gercektenYaz ? 'islendi' : 'atlandi',
        batch_request_id: batchId,
        processed_at: new Date().toISOString(),
        error: negatife_dustu ? 'Hesaplanan stok negatife düştü, 0 yazıldı' : null,
      })
      .in(
        'id',
        grup.satirlar.map((s) => s.id)
      )

    if (gercektenYaz) sonuc.islenen += grup.satirlar.length
    else sonuc.atlandi += grup.satirlar.length
  }

  return sonuc
}

/** Denemeyi artırır, bir sonraki denemeyi geciktirir; sınırı aşınca başarısız işaretler. */
async function ertele(
  supabase: ReturnType<typeof createServiceClient>,
  satirlar: KuyrukSatiri[],
  hata: string
): Promise<void> {
  for (const satir of satirlar) {
    const deneme = (satir.attempts ?? 0) + 1
    const bitti = deneme >= AZAMI_DENEME
    const beklemeDk = BEKLEME_DK[Math.min(deneme, BEKLEME_DK.length) - 1]
    await supabase
      .from('stock_sync_queue')
      .update({
        attempts: deneme,
        status: bitti ? 'basarisiz' : 'bekliyor',
        next_attempt_at: new Date(Date.now() + beklemeDk * 60_000).toISOString(),
        error: hata,
        processed_at: bitti ? new Date().toISOString() : null,
      })
      .eq('id', satir.id)
  }
}

/** Panel: son yazımlar (başarısızlar dahil). */
export async function sonYazimlar(limit = 50) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('stock_sync_log')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) return { kayitlar: [], tabloYok: tabloYok(error) }
  return { kayitlar: data ?? [], tabloYok: false }
}

/** Panel: yazılamayan (başarısız) kalem sayısı. */
export async function basarisizSayisi(): Promise<number> {
  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('stock_sync_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'basarisiz')
  if (error) return 0
  return count ?? 0
}

/** Panel: başarısızları yeniden kuyruğa alır. */
export async function basarisizlariTekrarla(): Promise<number> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('stock_sync_queue')
    .update({ status: 'bekliyor', attempts: 0, next_attempt_at: new Date().toISOString(), error: null })
    .eq('status', 'basarisiz')
    .select('id')
  if (error) return 0
  return data?.length ?? 0
}

/**
 * Son N dakikada Trendyol'a yazılmış barkodlar.
 *
 * Okuma senkronuyla barış: biz yazdıktan hemen sonra çalışan senkron, henüz
 * yansımamış değeri okuyup `trendyol_stock` alanını eski değere geri
 * çevirebilir. Bu listedeki barkodların stok/fiyat alanları o koşuda
 * güncellenmez.
 */
export async function sonYazilanBarkodlar(dakika = 15): Promise<Set<string>> {
  const supabase = createServiceClient()
  const sinir = new Date(Date.now() - dakika * 60_000).toISOString()
  const { data, error } = await supabase
    .from('stock_sync_log')
    .select('barcode')
    .gte('occurred_at', sinir)
    .in('item_status', ['GONDERILDI', 'SUCCESS'])
  if (error) return new Set()
  return new Set((data ?? []).map((s: { barcode: string }) => s.barcode))
}
