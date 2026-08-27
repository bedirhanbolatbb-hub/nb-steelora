import type { Metadata } from 'next'
import { gonderiyiYokla } from '@/lib/shipping/yoklama'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminSelectableOrderStatuses } from '@/lib/orders/statusTransitions'
import { getCarrierProvider } from '@/lib/shipping/providers'
import { gonderiGetir, olaylariGetir } from '@/lib/shipping/shipments'
import { bolgeEslestir, bolgeleriSenkronla, illeriGetir } from '@/lib/shipping/geo'
import SiparisDetayClient from './SiparisDetayClient'
import { mailTeslimDurumu, olayTurkce } from '@/lib/emails/teslimDurumu'
import type { PanelGonderi } from './KargoBlogu'
import { musteriMailiEngeli } from '@/lib/emails/musteriMaili'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { bsDurumu } from '@/lib/orders/bsBildirimi'

export const metadata: Metadata = { title: 'Sipariş detayı' }
export const dynamic = 'force-dynamic'

export default async function PanelSiparisDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  /**
   * Faz 30: sayfa açılışında kargo yoklaması.
   *
   * Vercel Hobby'de dakikalık cron yok; webhook düşerse durumun ilerlemesi
   * için üçüncü tetikleyici bu. BB siparişe baktığı an veri taze olur.
   * Hata yutulur — yoklama başarısızsa sayfa yine açılır.
   */
  try {
    await gonderiyiYokla(id)
  } catch {
    /* sayfa yoklamaya bağımlı değil */
  }

  const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  const yoneticiAdresi = await bildirimAdresi()
  // Faz 28: Bs bildirimi eşiği — aynı müşteriye aynı gün 5.000 TL (KDV hariç)
  // üzeri satış yapıldıysa panelde uyarı çıkar. Kimlik numarası otomatik
  // TOPLANMAZ; gerekirse BB müşteriden ister.
  const bs = o ? await bsDurumu(supabase, o.guest_email, o.created_at) : null
  if (!o) notFound()

  // Kalemlerdeki ürünlerin güncel görsel/slug bilgisi (görüntüleme için).
  const itemler = Array.isArray(o.items) ? (o.items as any[]) : []
  const productIds = itemler.map((i) => i?.productId ?? i?.product_id).filter((x) => x && x !== 'KARGO')
  let urunler: Record<string, { slug: string; image: string | null }> = {}
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, slug, override_images, trendyol_images')
      .in('id', productIds)
    urunler = Object.fromEntries(
      (data || []).map((p: any) => [
        p.id,
        {
          slug: p.slug,
          image:
            (p.override_images as string[] | null)?.[0] ??
            (p.trendyol_images as string[] | null)?.[0] ??
            null,
        },
      ])
    )
  }

  // Uygulanan kampanya (indirim satırında kod göstermek için)
  let kuponKodu: string | null = null
  if (o.applied_campaign_id) {
    const { data: kampanya } = await supabase
      .from('campaigns')
      .select('code, name')
      .eq('id', o.applied_campaign_id)
      .maybeSingle()
    kuponKodu = kampanya?.code || kampanya?.name || null
  }

  // ── Kargo katmanı (Faz 10A) ────────────────────────────────────────────
  const saglayici = getCarrierProvider()
  const adres = (o.shipping_address || {}) as Record<string, string>

  // Bölge önbelleği boşsa ilk açılışta sağlayıcıdan doldurulur.
  if ((await illeriGetir()).length === 0) {
    await bolgeleriSenkronla().catch(() => null)
  }

  const [gonderiSatiri, eslesme, bakiye] = await Promise.all([
    gonderiGetir(o.id),
    bolgeEslestir(adres.city || '', adres.district || '').catch(() => ({
      eslesti: false,
      stateId: null,
      cityId: null,
      ilAdi: null,
      ilceAdi: null,
      neden: 'Bölge listesi okunamadı — manuel seçim gerekiyor',
    })),
    saglayici.hazir ? saglayici.getBalance().catch(() => null) : Promise.resolve(null),
  ])

  const gonderi: PanelGonderi = gonderiSatiri
    ? {
        id: gonderiSatiri.id,
        saglayici: gonderiSatiri.provider,
        saglayiciAdi: saglayici.ad,
        saglayiciHazir: saglayici.hazir,
        saglayiciGonderiId: gonderiSatiri.provider_shipment_id,
        takipKodu: gonderiSatiri.tracking_code,
        firmaAdi: gonderiSatiri.carrier_name,
        durum: gonderiSatiri.status,
        durumHam: gonderiSatiri.status_raw,
        fiyat: gonderiSatiri.price_real != null ? Number(gonderiSatiri.price_real) : null,
        desi: gonderiSatiri.desi != null ? Number(gonderiSatiri.desi) : null,
        paketSayisi: gonderiSatiri.package_count,
        createdAt: gonderiSatiri.created_at,
        olaylar: (await olaylariGetir(gonderiSatiri.id)).map((e) => ({
          id: e.id,
          durum: e.status,
          not: e.note,
          zaman: e.occurred_at,
          kaynak: e.source,
        })),
      }
    : null

  return (
    <SiparisDetayClient
      kargo={{
        siparisId: o.id,
        siparisDurumu: o.status ?? 'pending',
        gonderi,
        saglayiciAdi: saglayici.ad,
        saglayiciHazir: saglayici.hazir,
        onDolu: {
          ad: adres.full_name || '',
          telefon: adres.phone || '',
          adres: adres.address || '',
          il: eslesme.ilAdi || adres.city || '',
          ilce: eslesme.ilceAdi || adres.district || '',
        },
        bolgeEslesme: {
          eslesti: eslesme.eslesti,
          stateId: eslesme.stateId,
          cityId: eslesme.cityId,
          neden: eslesme.neden,
        },
        bakiye,
      }}
      siparis={{
        id: o.id,
        no: o.order_number ?? '—',
        durum: o.status ?? 'pending',
        secilebilirDurumlar: getAdminSelectableOrderStatuses(o.status),
        email: o.guest_email ?? null,
        // Müşteri maili gidebilir mi? Panelde kırmızı uyarı için (Faz 15 sonrası).
        mailEngeli: musteriMailiEngeli(o.guest_email, o.order_number, yoneticiAdresi)?.sebep ?? null,
        items: itemler
          .filter((i) => (i?.productId ?? i?.product_id) !== 'KARGO')
          .map((i: any) => {
            const pid = i?.productId ?? i?.product_id
            return {
              // Faz 30: kalem iptali için ürün kimliği de taşınıyor.
              productId: String(pid ?? ''),
              ad: i?.name ?? '—',
              adet: Number(i?.quantity || 1),
              birim: Number(i?.price || 0),
              slug: urunler[pid]?.slug ?? null,
              image: urunler[pid]?.image ?? null,
            }
          }),
        araToplam: Number(o.subtotal || 0),
        kargo: Number(o.shipping_cost || 0),
        indirim: Number(o.discount_amount || 0),
        kuponKodu,
        toplam: Number(o.total || 0),
        adres: (o.shipping_address as any) ?? null,
        hediyeNotu: o.gift_note ?? null,
        // Kalem iptali yalnız kargo oluşturulmadan ve ödeme aşamasındayken.
        kalemIptalMumkun:
          ['paid', 'preparing'].includes(String(o.status)) && !gonderiSatiri && itemler.length > 1,
        iptalEdilenKalemler: ((o.metadata as any)?.iptal_kalemler ?? []) as any[],
        // Faz 30: hangi mail ne zaman gitti — panelde görünür olsun.
        mailGecmisi: ((o.metadata as any)?.bildirim ?? {}) as Record<string, string>,
        // Faz 11D: iç notlar — müşteriye görünmez, panel-yalnız.
        icNotlar: (Array.isArray((o.metadata as any)?.panel_notlari)
          ? (o.metadata as any).panel_notlari
          : []) as { t: string; m: string }[],
        // Faz 11C: gönderildi ≠ ulaştı. Damgada saklanan Resend id'siyle son
        // olay sorgulanır (delivered / bounced / complained). Anahtar
        // yalnız-gönderim yetkiliyse panel bunu açıkça söyler.
        ...(await (async () => {
          const idler = ((o.metadata as any)?.bildirim_id ?? {}) as Record<string, string>
          const girisler = Object.entries(idler)
          if (!girisler.length) return { mailDurumlari: {}, mailDurumuKisitli: false }
          const sonuclar = await Promise.all(
            girisler.map(async ([tur, id]) => [tur, await mailTeslimDurumu(id)] as const)
          )
          const durumlar: Record<string, { etiket: string; olay: string }> = {}
          let kisitli = false
          for (const [tur, d] of sonuclar) {
            if (d.durum === 'ok') durumlar[tur] = { etiket: olayTurkce(d.sonOlay), olay: d.sonOlay }
            else if (d.durum === 'kisitli') kisitli = true
          }
          return { mailDurumlari: durumlar, mailDurumuKisitli: kisitli }
        })()),
        // Kurumsal fatura yalnız müşteri istediyse dolu (Faz 28).
        fatura: (o.metadata as any)?.fatura ?? null,
        bsUyarisi: bs?.asildi
          ? {
              gunlukToplam: bs.gunlukToplam,
              matrah: bs.matrah,
              siparisSayisi: bs.siparisSayisi,
            }
          : null,
        iyzicoId: o.iyzico_payment_id ?? null,
        takipNo: o.tracking_number ?? null,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        stockDeductedAt: o.stock_deducted_at,
        stockRestoredAt: o.stock_restored_at,
        paymentRefundedAt: o.payment_refunded_at,
        reviewInviteSentAt: o.review_invite_sent_at,
      }}
    />
  )
}
