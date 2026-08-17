import { createHmac, timingSafeEqual } from 'crypto'
import type {
  Bakiye,
  CarrierProvider,
  GonderiDurum,
  GonderiOlusturGirdi,
  GonderiOlusturSonuc,
  KargoDurumu,
  SecimSonuc,
  Teklif,
  WebhookSonuc,
} from './types'

const BASE = 'https://app.kargonomi.com.tr/api/v1'

/**
 * Kargonomi durum kodları → iç durumlarımız.
 * Sağlayıcı yeni bir kod eklerse eşlenmeyen kod 'hazirlaniyor' sayılır ve ham
 * kod status_raw'da saklandığı için panelde görünür (sessiz kayıp yok).
 */
const DURUM_ESLEME: Record<string, KargoDurumu> = {
  draft: 'hazirlaniyor',
  ready: 'hazirlaniyor',
  webservice_order_creating: 'hazirlaniyor',
  webservice_order_created: 'kargoya_verildi',
  webservice_order_failed: 'hazirlaniyor',
  webservice_checking_shipment: 'kargoya_verildi',
  webservice_shipment_started: 'yolda',
  webservice_shipment_delivered: 'teslim_edildi',
  webservice_shipment_not_delivered: 'teslim_edilemedi',
  webservice_shipment_returning: 'iade_surecinde',
  webservice_shipment_missing: 'kayip',
  cancelled: 'iptal',
  request_for_cancellation: 'iptal',
}

/**
 * Kargonomi telefonu 10 RAKAM olarak ister (5xxxxxxxxx).
 * Sipariş adreslerinde numara "05551112233" ya da "+90 555 111 22 33" gibi
 * geliyor; baştaki 0 / +90 ayıklanır (Faz 10B — canlıda doğrulandı).
 */
export function telefonNormalize(ham: string): string {
  let d = (ham || '').replace(/\D/g, '')
  if (d.startsWith('90') && d.length === 12) d = d.slice(2)
  if (d.startsWith('0') && d.length === 11) d = d.slice(1)
  return d.slice(-10)
}

function slugla(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export class KargonomiProvider implements CarrierProvider {
  readonly slug = 'kargonomi'
  readonly ad = 'Kargonomi'

  private token = process.env.KARGONOMI_TOKEN || ''
  private webhookSecret = process.env.KARGONOMI_WEBHOOK_SECRET || ''
  private warehouseId = process.env.KARGONOMI_WAREHOUSE_ID || ''

  get hazir(): boolean {
    return Boolean(this.token)
  }

  private async istek<T>(yol: string, init?: RequestInit): Promise<T> {
    if (!this.token) throw new Error('KARGONOMI_TOKEN tanımlı değil')
    const res = await fetch(`${BASE}${yol}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    })
    const metin = await res.text()
    let govde: any = null
    try {
      govde = metin ? JSON.parse(metin) : null
    } catch {
      /* JSON değilse ham metni hata mesajında kullanırız */
    }
    if (!res.ok) {
      throw new Error(govde?.message || govde?.error || `Kargonomi ${res.status}: ${metin.slice(0, 200)}`)
    }
    return govde as T
  }

  mapStatus(durumHam: string): KargoDurumu {
    return DURUM_ESLEME[durumHam] ?? 'hazirlaniyor'
  }

  async createShipment(girdi: GonderiOlusturGirdi): Promise<GonderiOlusturSonuc> {
    const shipment: Record<string, unknown> = {
      buyer_name: girdi.alici.ad,
      buyer_phone: telefonNormalize(girdi.alici.telefon),
      buyer_address: girdi.alici.adres,
      buyer_state_id: girdi.alici.stateId,
      buyer_city_id: girdi.alici.cityId,
      packages: girdi.paketler.map((p) => ({
        content: p.icerik,
        barcode: p.barkod || girdi.siparisNo,
        desi: p.desi,
      })),
    }
    // Gönderici ya depo kimliğinden ya da sender_* alanlarından gelir.
    if (this.warehouseId) shipment.warehouse_id = Number(this.warehouseId)

    const yanit = await this.istek<any>('/shipments', {
      method: 'POST',
      body: JSON.stringify({ shipment }),
    })
    const veri = yanit?.data ?? yanit
    const durumHam = String(veri?.status ?? 'draft')
    return {
      saglayiciGonderiId: String(veri?.id ?? ''),
      durum: this.mapStatus(durumHam),
      durumHam,
    }
  }

  /**
   * Fiyat karşılaştırması.
   * Kargonomi yanıtı `{ user_credit, shipping_provider_with_price: [...] }`
   * biçiminde geliyor (canlıda doğrulandı — Faz 10B); eski `data`/`prices`
   * varsayımı boş liste üretiyordu.
   */
  async getRates(saglayiciGonderiId: string): Promise<Teklif[]> {
    const yanit = await this.istek<any>(`/shipment-price-comparison/${saglayiciGonderiId}`)
    const liste: any[] =
      yanit?.shipping_provider_with_price ??
      yanit?.data?.shipping_provider_with_price ??
      yanit?.data ??
      (Array.isArray(yanit) ? yanit : [])

    return liste
      .map((t: any) => {
        const ad = String(t?.name ?? t?.shipping_provider?.name ?? t?.provider_name ?? 'Bilinmeyen')
        return {
          firmaId: String(t?.shipping_provider_id ?? t?.id ?? ''),
          firmaAdi: ad,
          // Sağlayıcı kendi slug'ını veriyor; yoksa addan türetiriz.
          firmaSlug: String(t?.slug || slugla(ad)),
          fiyat: Math.round(Number(t?.price ?? t?.amount ?? 0) * 100) / 100,
          paraBirimi: String(t?.currency ?? 'TRY'),
        }
      })
      .filter((t) => t.firmaId && t.fiyat > 0)
      .sort((a, b) => a.fiyat - b.fiyat)
  }

  async selectCarrier(saglayiciGonderiId: string, firmaId: string | null): Promise<SecimSonuc> {
    // -1 = sağlayıcı en ucuzu seçsin (Kargonomi sözleşmesi).
    await this.istek<any>('/confirm-shipping-price', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: Number(saglayiciGonderiId),
        shipping_provider_id: firmaId ? Number(firmaId) : -1,
      }),
    })
    // Onay sonrası takip kodu/firma gönderinin kendisinden okunur.
    const durum = await this.fetchShipment(saglayiciGonderiId)
    return {
      firmaAdi: durum.firmaAdi ?? '—',
      firmaSlug: durum.firmaSlug ?? 'bilinmiyor',
      fiyat: durum.fiyat,
      takipKodu: durum.takipKodu,
      durum: durum.durum,
      durumHam: durum.durumHam,
    }
  }

  async getLabelPdf(saglayiciGonderiId: string): Promise<{ base64: string }> {
    const yanit = await this.istek<any>(`/shipments/${saglayiciGonderiId}/barcode?format=pdf`)
    const base64 = String(yanit?.data?.file ?? yanit?.file ?? yanit?.data ?? '')
    if (!base64) throw new Error('Etiket PDF alınamadı')
    return { base64 }
  }

  /**
   * Gönderiyi iptal eder.
   *
   * Kargonomi'de iki ayrı yol var (canlıda doğrulandı — Faz 10B):
   *  - Henüz onaylanmamış TASLAK: `DELETE /shipments/{id}` (204) — `cancel`
   *    ucu taslakta "Server Error" veriyor.
   *  - Onaylanmış gönderi: `POST /shipments/cancel` (iptal talebi).
   * Durumu önce okuyup doğru yolu seçeriz.
   */
  async cancelShipment(saglayiciGonderiId: string): Promise<{ durum: KargoDurumu; durumHam: string }> {
    let taslakMi = false
    try {
      const mevcut = await this.fetchShipment(saglayiciGonderiId)
      taslakMi = ['draft', 'ready'].includes(mevcut.durumHam)
    } catch {
      // Durum okunamazsa iptal talebi yoluna düşeriz.
    }

    if (taslakMi) {
      await this.istek<any>(`/shipments/${saglayiciGonderiId}`, { method: 'DELETE' })
      return { durum: 'iptal', durumHam: 'cancelled' }
    }

    const yanit = await this.istek<any>('/shipments/cancel', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: Number(saglayiciGonderiId) }),
    })
    const durumHam = String(yanit?.data?.status ?? 'request_for_cancellation')
    return { durum: this.mapStatus(durumHam), durumHam }
  }

  async fetchShipment(saglayiciGonderiId: string): Promise<GonderiDurum> {
    const yanit = await this.istek<any>(`/shipments/${saglayiciGonderiId}`)
    const veri = yanit?.data ?? yanit
    const durumHam = String(veri?.status ?? 'draft')
    const firmaAdi = veri?.shipping_provider?.name ?? veri?.provider_name ?? null
    return {
      durum: this.mapStatus(durumHam),
      durumHam,
      takipKodu: veri?.tracking_code ?? veri?.tracking_number ?? veri?.barcode ?? null,
      firmaAdi,
      firmaSlug: firmaAdi ? slugla(String(firmaAdi)) : null,
      fiyat: veri?.price != null ? Number(veri.price) : null,
    }
  }

  parseWebhook(hamGovde: string, basliklar: Headers): WebhookSonuc {
    if (!this.webhookSecret) {
      return { ok: false, hata: 'Webhook secret tanımlı değil', status: 401 }
    }
    const imza = basliklar.get('X-Webhook-Signature') || basliklar.get('x-webhook-signature')
    if (!imza) return { ok: false, hata: 'İmza yok', status: 401 }

    const beklenen = createHmac('sha256', this.webhookSecret).update(hamGovde).digest('hex')
    const a = Buffer.from(beklenen)
    const b = Buffer.from(imza.trim())
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, hata: 'İmza doğrulanamadı', status: 401 }
    }

    let govde: any
    try {
      govde = JSON.parse(hamGovde)
    } catch {
      return { ok: false, hata: 'Gövde JSON değil', status: 400 }
    }
    if (govde?.event_type && govde.event_type !== 'shipment.updated') {
      return { ok: false, hata: `Desteklenmeyen olay: ${govde.event_type}`, status: 400 }
    }

    const veri = govde?.data ?? govde?.shipment ?? govde
    const saglayiciGonderiId = String(veri?.id ?? veri?.shipment_id ?? '')
    if (!saglayiciGonderiId) return { ok: false, hata: 'Gönderi kimliği yok', status: 400 }

    const durumHam = String(veri?.status ?? '')
    return {
      ok: true,
      saglayiciGonderiId,
      durum: this.mapStatus(durumHam),
      durumHam,
      idempotencyKey: govde?.meta?.idempotency_key ?? null,
      takipKodu: veri?.tracking_code ?? veri?.tracking_number ?? veri?.barcode ?? null,
      olayZamani: govde?.meta?.occurred_at ?? veri?.updated_at ?? null,
      not: veri?.status_description ?? null,
    }
  }

  async getBalance(): Promise<Bakiye> {
    try {
      const yanit = await this.istek<any>('/user/credit')
      const veri = yanit?.data ?? yanit
      // Bakiye yokken alan null geliyor (canlıda doğrulandı); 0 olarak okunur.
      const ham = veri?.credit ?? veri?.balance ?? veri?.amount ?? 0
      const tutar = Number(ham) || 0
      return { tutar, paraBirimi: String(veri?.currency ?? 'TRY') }
    } catch {
      return null
    }
  }

  /** Panelin il/ilçe seçicisini besleyen uçlar. */
  async getStates(): Promise<{ id: number; ad: string }[]> {
    const yanit = await this.istek<any>('/states/1')
    const liste: any[] = yanit?.data ?? (Array.isArray(yanit) ? yanit : [])
    return liste.map((s: any) => ({ id: Number(s.id), ad: String(s.name) }))
  }

  async getCities(stateId: number): Promise<{ id: number; ad: string }[]> {
    const yanit = await this.istek<any>(`/cities/${stateId}`)
    const liste: any[] = yanit?.data ?? (Array.isArray(yanit) ? yanit : [])
    return liste.map((c: any) => ({ id: Number(c.id), ad: String(c.name) }))
  }
}

export const KARGONOMI_DURUM_ESLEME = DURUM_ESLEME
