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

/**
 * Token gelene kadar uçtan uca çalışan deterministik sahte sağlayıcı.
 *
 * Gerçek adaptörle AYNI arayüzü uygular; ağa çıkmaz, para harcamaz, gönderi
 * oluşturmaz. Üretilen kimlik/takip kodu sipariş numarasından türetilir, yani
 * aynı sipariş her koşuda aynı sonucu verir (test tekrar edilebilir olsun).
 * Webhook imzası gerçek adaptörle aynı şemadadır (HMAC-SHA256), böylece imza
 * doğrulama yolu da mock'la test edilebilir.
 */

const DURUM_ESLEME: Record<string, KargoDurumu> = {
  draft: 'hazirlaniyor',
  ready: 'hazirlaniyor',
  created: 'kargoya_verildi',
  in_transit: 'yolda',
  out_for_delivery: 'dagitimda',
  delivered: 'teslim_edildi',
  not_delivered: 'teslim_edilemedi',
  returning: 'iade_surecinde',
  missing: 'kayip',
  cancelled: 'iptal',
}

const FIRMALAR = [
  { firmaId: '1', firmaAdi: 'Kolay Gelsin', firmaSlug: 'kolay-gelsin', taban: 74.5 },
  { firmaId: '2', firmaAdi: 'Aras Kargo', firmaSlug: 'aras', taban: 82.0 },
  { firmaId: '3', firmaAdi: 'Sürat Kargo', firmaSlug: 'surat', taban: 79.25 },
  { firmaId: '4', firmaAdi: 'HepsiJET', firmaSlug: 'hepsijet', taban: 88.9 },
  { firmaId: '5', firmaAdi: 'PTT Kargo', firmaSlug: 'ptt', taban: 69.75 },
]

// 81 il, alfabetik — kimlik = sıra numarası.
const ILLER = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
  'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
  'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
]

// Yoğun illerin ilçeleri; listelenmeyen iller tek "Merkez" ilçesiyle gelir
// (eşleşmeyen ilçe → panelde manuel seçim yolu da böylece test edilebilir).
const ILCELER: Record<string, string[]> = {
  İstanbul: ['Adalar', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bakırköy', 'Beşiktaş', 'Beykoz', 'Beyoğlu', 'Kadıköy', 'Kartal', 'Maltepe', 'Pendik', 'Sarıyer', 'Şişli', 'Ümraniye', 'Üsküdar'],
  Ankara: ['Altındağ', 'Çankaya', 'Etimesgut', 'Keçiören', 'Mamak', 'Pursaklar', 'Sincan', 'Yenimahalle'],
  İzmir: ['Bornova', 'Buca', 'Çiğli', 'Gaziemir', 'Karabağlar', 'Karşıyaka', 'Konak', 'Menemen'],
  Mersin: ['Akdeniz', 'Anamur', 'Erdemli', 'Mezitli', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir'],
  Bursa: ['Gemlik', 'Gürsu', 'İnegöl', 'Mudanya', 'Nilüfer', 'Osmangazi', 'Yıldırım'],
  Antalya: ['Alanya', 'Kepez', 'Konyaaltı', 'Manavgat', 'Muratpaşa', 'Serik'],
  Adana: ['Çukurova', 'Sarıçam', 'Seyhan', 'Yüreğir'],
  Konya: ['Ereğli', 'Karatay', 'Meram', 'Selçuklu'],
  Kocaeli: ['Darıca', 'Gebze', 'İzmit', 'Körfez'],
}

/** Sipariş numarasından sabit bir sayı — deterministik kimlik/kod üretimi. */
function tohum(metin: string): number {
  let h = 0
  for (let i = 0; i < metin.length; i++) h = (h * 31 + metin.charCodeAt(i)) >>> 0
  return h
}

// Süreç içi durum defteri: mock gönderilerin son bilinen hâli.
type Kayit = { durumHam: string; takipKodu: string | null; firma: (typeof FIRMALAR)[number] | null; fiyat: number | null; desi: number }
const g = globalThis as unknown as { __nbMockShipments?: Map<string, Kayit> }
function defter(): Map<string, Kayit> {
  if (!g.__nbMockShipments) g.__nbMockShipments = new Map()
  return g.__nbMockShipments
}

export class MockProvider implements CarrierProvider {
  readonly slug = 'mock'
  readonly ad = 'Mock (test sağlayıcısı)'
  readonly hazir = true

  // Faz 27: sabit varsayılan KALDIRILDI. Bu değer kaynak kodda açıkça
  // yazıyordu ve KARGONOMI_WEBHOOK_SECRET tanımsızken üretimde de geçerli
  // imza üretmeye yetiyordu — kimliksiz biri sahte 'teslim_edildi' olayı
  // gönderip siparişi delivered'a çekebilirdi. Sır yoksa imza doğrulaması
  // hiçbir isteği kabul etmez.
  private webhookSecret = process.env.KARGONOMI_WEBHOOK_SECRET || ''

  mapStatus(durumHam: string): KargoDurumu {
    return DURUM_ESLEME[durumHam] ?? 'hazirlaniyor'
  }

  async createShipment(girdi: GonderiOlusturGirdi): Promise<GonderiOlusturSonuc> {
    const id = `MOCK-${tohum(girdi.siparisNo) % 900000 + 100000}`
    const desi = girdi.paketler.reduce((t, p) => t + (p.desi || 1), 0)
    defter().set(id, { durumHam: 'ready', takipKodu: null, firma: null, fiyat: null, desi })
    return { saglayiciGonderiId: id, durum: 'hazirlaniyor', durumHam: 'ready' }
  }

  async getRates(saglayiciGonderiId: string): Promise<Teklif[]> {
    const kayit = defter().get(saglayiciGonderiId)
    const desi = kayit?.desi ?? 1
    return FIRMALAR.map((f) => ({
      firmaId: f.firmaId,
      firmaAdi: f.firmaAdi,
      firmaSlug: f.firmaSlug,
      fiyat: Math.round((f.taban + (desi - 1) * 12.5) * 100) / 100,
      paraBirimi: 'TRY',
    }))
  }

  async selectCarrier(saglayiciGonderiId: string, firmaId: string | null): Promise<SecimSonuc> {
    const teklifler = await this.getRates(saglayiciGonderiId)
    const secili = firmaId
      ? teklifler.find((t) => t.firmaId === firmaId)
      : [...teklifler].sort((a, b) => a.fiyat - b.fiyat)[0]
    if (!secili) throw new Error('Seçilen firma bulunamadı')

    const firma = FIRMALAR.find((f) => f.firmaId === secili.firmaId)!
    const takipKodu = `${firma.firmaSlug.toUpperCase().replace(/-/g, '').slice(0, 4)}${tohum(saglayiciGonderiId + firma.firmaId) % 900000000 + 100000000}`
    const onceki = defter().get(saglayiciGonderiId)
    defter().set(saglayiciGonderiId, {
      durumHam: 'created',
      takipKodu,
      firma,
      fiyat: secili.fiyat,
      desi: onceki?.desi ?? 1,
    })
    return {
      firmaAdi: firma.firmaAdi,
      firmaSlug: firma.firmaSlug,
      fiyat: secili.fiyat,
      takipKodu,
      durum: 'kargoya_verildi',
      durumHam: 'created',
    }
  }

  async getLabelPdf(saglayiciGonderiId: string): Promise<{ base64: string }> {
    const kayit = defter().get(saglayiciGonderiId)
    // Geçerli, açılabilir tek sayfalık PDF — panelde indirme akışı gerçekten test edilsin.
    const metin = `NB STEELORA - TEST ETIKETI  ${saglayiciGonderiId}  ${kayit?.takipKodu ?? ''}`
    const icerik = `BT /F1 11 Tf 40 720 Td (${metin.replace(/[()\\]/g, '')}) Tj ET`
    const nesneler = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${icerik.length} >>\nstream\n${icerik}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]
    let pdf = '%PDF-1.4\n'
    const konumlar: number[] = []
    nesneler.forEach((n, i) => {
      konumlar.push(pdf.length)
      pdf += `${i + 1} 0 obj\n${n}\nendobj\n`
    })
    const xrefKonum = pdf.length
    pdf += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n`
    konumlar.forEach((k) => { pdf += `${String(k).padStart(10, '0')} 00000 n \n` })
    pdf += `trailer\n<< /Size ${nesneler.length + 1} /Root 1 0 R >>\nstartxref\n${xrefKonum}\n%%EOF`
    return { base64: Buffer.from(pdf, 'latin1').toString('base64') }
  }

  async cancelShipment(saglayiciGonderiId: string): Promise<{ durum: KargoDurumu; durumHam: string }> {
    const kayit = defter().get(saglayiciGonderiId)
    defter().set(saglayiciGonderiId, {
      durumHam: 'cancelled',
      takipKodu: kayit?.takipKodu ?? null,
      firma: kayit?.firma ?? null,
      fiyat: kayit?.fiyat ?? null,
      desi: kayit?.desi ?? 1,
    })
    return { durum: 'iptal', durumHam: 'cancelled' }
  }

  async fetchShipment(saglayiciGonderiId: string): Promise<GonderiDurum> {
    const kayit = defter().get(saglayiciGonderiId)
    const durumHam = kayit?.durumHam ?? 'ready'
    return {
      durum: this.mapStatus(durumHam),
      durumHam,
      takipKodu: kayit?.takipKodu ?? null,
      firmaAdi: kayit?.firma?.firmaAdi ?? null,
      firmaSlug: kayit?.firma?.firmaSlug ?? null,
      fiyat: kayit?.fiyat ?? null,
    }
  }

  parseWebhook(hamGovde: string, basliklar: Headers): WebhookSonuc {
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

    const veri = govde?.data ?? govde
    const saglayiciGonderiId = String(veri?.id ?? '')
    if (!saglayiciGonderiId) return { ok: false, hata: 'Gönderi kimliği yok', status: 400 }
    const durumHam = String(veri?.status ?? '')

    // Mock defterini de ilerlet ki fetchShipment webhook'la tutarlı kalsın.
    const kayit = defter().get(saglayiciGonderiId)
    if (kayit) defter().set(saglayiciGonderiId, { ...kayit, durumHam })

    return {
      ok: true,
      saglayiciGonderiId,
      durum: this.mapStatus(durumHam),
      durumHam,
      idempotencyKey: govde?.meta?.idempotency_key ?? null,
      takipKodu: veri?.tracking_code ?? kayit?.takipKodu ?? null,
      olayZamani: govde?.meta?.occurred_at ?? null,
      not: veri?.status_description ?? null,
    }
  }

  async getBalance(): Promise<Bakiye> {
    return { tutar: 1000, paraBirimi: 'TRY' }
  }

  /**
   * Türkiye il listesi — kimlikler alfabetik sıra numarasıdır (deterministik).
   * Gerçek sağlayıcıda bu liste /states'ten gelir; mock'ta eşleme akışının
   * (ve eşleşmeyince manuel seçim davranışının) test edilebilmesi için var.
   */
  async getStates(): Promise<{ id: number; ad: string }[]> {
    return ILLER.map((ad, i) => ({ id: i + 1, ad }))
  }

  async getCities(stateId: number): Promise<{ id: number; ad: string }[]> {
    const il = ILLER[stateId - 1]
    if (!il) return []
    const ilceler = ILCELER[il] ?? ['Merkez']
    // İlçe kimliği il kimliğiyle çakışmasın diye ötelenir.
    return ilceler.map((ad, i) => ({ id: stateId * 1000 + i + 1, ad }))
  }
}

export const MOCK_DURUM_ESLEME = DURUM_ESLEME
