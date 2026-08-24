import { createServiceClient } from '@/lib/supabase/service'
import { getProviderBySlug } from '@/lib/shipping/providers'
import { gonderiGuncelle, olayEkle, siparisTakipNoSenkronla } from '@/lib/shipping/shipments'
import { siparisiKargodanIlerlet } from '@/lib/orders/otomatikDurum'

/**
 * Kargo yoklaması — webhook'un YEDEĞİ (Faz 30).
 *
 * Webhook birincil yoldur ve anlıktır. Ama tek yola bağlı kalmak, bir
 * webhook düşerse siparişin sonsuza kadar "Hazırlanıyor" kalması demek —
 * geçen turda tam olarak bu oldu (kargo fiilen verilmişti, sistemde durum
 * ilerlememişti).
 *
 * GECİKME RİSKİ (Vercel Hobby): dakikalık cron YOK, en sık günde bir kez
 * çalışabiliyoruz. Bu yüzden yoklama üç ayrı tetikleyiciye bağlandı:
 *   1. Gecelik sağlık işi (06:00) — garantili taban.
 *   2. Günlük Trendyol senkronu (09:00) — ikinci tur.
 *   3. Panel sipariş listesi/detayı açıldığında — BB panele baktığı an taze.
 * Webhook çalıştığı sürece bunların hiçbirine ihtiyaç olmaz; çalışmadığında
 * en kötü gecikme BB'nin panele bakmasına kadar, o da olmazsa ertesi sabah.
 *
 * Yalnız AÇIK gönderiler yoklanır: teslim edilmiş ya da iptal edilmiş bir
 * gönderiyi tekrar sormanın anlamı yok (kota ve süre boşa gitmesin).
 */

/** Yoklanmayacak — akışı bitmiş durumlar. */
const KAPALI_DURUMLAR = ['teslim_edildi', 'iptal', 'kayip']

export type YoklamaSonucu = {
  bakilan: number
  guncellenen: number
  ilerleyenSiparis: number
  gonderilenMail: number
  hata: number
  ayrinti: string[]
}

/**
 * Açık gönderileri sağlayıcıdan yoklar, değişeni yazar ve siparişi ilerletir.
 *
 * @param azami Tek koşuda en fazla kaç gönderi (süre sınırı için).
 */
export async function gonderileriYokla(azami = 25): Promise<YoklamaSonucu> {
  const sonuc: YoklamaSonucu = {
    bakilan: 0,
    guncellenen: 0,
    ilerleyenSiparis: 0,
    gonderilenMail: 0,
    hata: 0,
    ayrinti: [],
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('shipments')
      .select('id, order_id, provider, provider_shipment_id, status, tracking_code')
      .not('status', 'in', `(${KAPALI_DURUMLAR.join(',')})`)
      .is('cancelled_at', null)
      .order('updated_at', { ascending: true })
      .limit(azami)

    if (error || !data?.length) return sonuc

    for (const g of data) {
      sonuc.bakilan++
      const saglayici = getProviderBySlug(g.provider)
      if (!saglayici?.hazir) continue

      try {
        const durum = await saglayici.fetchShipment(g.provider_shipment_id)

        const degisti = durum.durum !== g.status
        const kodGeldi = Boolean(durum.takipKodu && durum.takipKodu !== g.tracking_code)

        if (degisti || kodGeldi || durum.firmaAdi) {
          await gonderiGuncelle(g.id, {
            status: durum.durum,
            status_raw: durum.durumHam,
            ...(durum.takipKodu ? { tracking_code: durum.takipKodu } : {}),
            ...(durum.firmaAdi ? { carrier_name: durum.firmaAdi, carrier_slug: durum.firmaSlug } : {}),
            ...(durum.fiyat != null ? { price_real: durum.fiyat } : {}),
          })
          if (degisti) {
            sonuc.guncellenen++
            await olayEkle({
              shipmentId: g.id,
              status: durum.durum,
              statusRaw: durum.durumHam,
              note: 'Yoklamayla güncellendi',
              source: 'poll',
            })
          }
          if (durum.takipKodu) await siparisTakipNoSenkronla(g.order_id, durum.takipKodu)
        }

        // Durum değişmese bile ilerletmeyi deneriz: önceki koşuda mail
        // gönderilememiş olabilir (damga yoksa tekrar denenir).
        const ilerleme = await siparisiKargodanIlerlet(g.order_id, durum.durum, durum.takipKodu)
        if (ilerleme.durumDegisti) sonuc.ilerleyenSiparis++
        sonuc.gonderilenMail += ilerleme.mailGonderildi.length
        if (ilerleme.durumDegisti || ilerleme.mailGonderildi.length) {
          sonuc.ayrinti.push(
            `${g.provider_shipment_id}: ${durum.durumHam}` +
              (ilerleme.yeniDurum ? ` → sipariş ${ilerleme.yeniDurum}` : '') +
              (ilerleme.mailGonderildi.length ? ` · mail ${ilerleme.mailGonderildi.join('+')}` : '')
          )
        }
      } catch (e: any) {
        sonuc.hata++
        console.error('[yoklama] gönderi okunamadı:', g.provider_shipment_id, e?.message)
      }
    }
  } catch (e: any) {
    console.error('[yoklama] beklenmeyen hata:', e?.message)
  }

  return sonuc
}

/**
 * Tek bir siparişin gönderisini yoklar (panel sayfası açılışında).
 *
 * Süre maliyeti bir HTTP çağrısı; sayfa zaten dinamik. Gönderi kapalı
 * durumdaysa hiç sorulmaz.
 */
export async function gonderiyiYokla(orderId: string): Promise<YoklamaSonucu | null> {
  const supabase = createServiceClient()
  const { data: g } = await supabase
    .from('shipments')
    .select('id, order_id, provider, provider_shipment_id, status, tracking_code')
    .eq('order_id', orderId)
    .is('cancelled_at', null)
    .maybeSingle()

  if (!g || KAPALI_DURUMLAR.includes(String(g.status))) return null

  const saglayici = getProviderBySlug(g.provider)
  if (!saglayici?.hazir) return null

  const durum = await saglayici.fetchShipment(g.provider_shipment_id)
  const degisti = durum.durum !== g.status

  await gonderiGuncelle(g.id, {
    status: durum.durum,
    status_raw: durum.durumHam,
    ...(durum.takipKodu ? { tracking_code: durum.takipKodu } : {}),
    ...(durum.firmaAdi ? { carrier_name: durum.firmaAdi, carrier_slug: durum.firmaSlug } : {}),
    ...(durum.fiyat != null ? { price_real: durum.fiyat } : {}),
  })
  if (degisti) {
    await olayEkle({
      shipmentId: g.id,
      status: durum.durum,
      statusRaw: durum.durumHam,
      note: 'Panel açılışında yoklandı',
      source: 'poll',
    })
  }
  if (durum.takipKodu) await siparisTakipNoSenkronla(g.order_id, durum.takipKodu)

  const ilerleme = await siparisiKargodanIlerlet(g.order_id, durum.durum, durum.takipKodu)
  return {
    bakilan: 1,
    guncellenen: degisti ? 1 : 0,
    ilerleyenSiparis: ilerleme.durumDegisti ? 1 : 0,
    gonderilenMail: ilerleme.mailGonderildi.length,
    hata: 0,
    ayrinti: ilerleme.atlandi ? [ilerleme.atlandi] : [],
  }
}
