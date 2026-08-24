/**
 * Sağlayıcıdan bağımsız kargo katmanı (Faz 10A).
 *
 * Uygulama yalnız bu arayüzü tanır; Kargonomi ilk uygulamadır, ikinci bir
 * sağlayıcı gerekirse tek yapılacak iş yeni bir adaptör yazmaktır. Sağlayıcıya
 * özgü hiçbir alan (kod, id, terminoloji) bu dosyanın dışına sızmaz.
 */

/** İç durum kümesi — vitrin, panel ve DB yalnız bunları bilir. */
export const KARGO_DURUMLARI = [
  'hazirlaniyor',
  'kargoya_verildi',
  'yolda',
  'dagitimda',
  'teslim_edildi',
  'teslim_edilemedi',
  'iade_surecinde',
  'kayip',
  'iptal',
] as const

export type KargoDurumu = (typeof KARGO_DURUMLARI)[number]

/** Müşteriye ve panele gösterilen Türkçe etiketler. */
export const DURUM_ETIKETLERI: Record<KargoDurumu, string> = {
  hazirlaniyor: 'Hazırlanıyor',
  kargoya_verildi: 'Kargoya verildi',
  yolda: 'Yolda',
  dagitimda: 'Dağıtımda',
  teslim_edildi: 'Teslim edildi',
  teslim_edilemedi: 'Teslim edilemedi',
  iade_surecinde: 'İade sürecinde',
  kayip: 'Kayıp',
  iptal: 'İptal edildi',
}

/** Müşteri çizelgesinde ilerleme sırası (dallanan durumlar dışarıda). */
export const DURUM_SIRASI: KargoDurumu[] = [
  'hazirlaniyor',
  'kargoya_verildi',
  'yolda',
  'dagitimda',
  'teslim_edildi',
]

/** Sürecin bittiği durumlar — poll/webhook sonrası ilerleme beklenmez. */
export const SON_DURUMLAR: KargoDurumu[] = ['teslim_edildi', 'iptal', 'kayip']

export type Alici = {
  ad: string
  telefon: string
  adres: string
  /** Sağlayıcının il kimliği (bizde geo eşlemesinden gelir). */
  stateId: number
  /** Sağlayıcının ilçe kimliği. */
  cityId: number
}

export type Paket = {
  icerik: string
  desi: number
  /** Sipariş numarası vb. — sağlayıcıya referans olarak gider. */
  barkod?: string
}

export type GonderiOlusturGirdi = {
  siparisNo: string
  alici: Alici
  paketler: Paket[]
}

export type GonderiOlusturSonuc = {
  saglayiciGonderiId: string
  durum: KargoDurumu
  durumHam: string
  /** Oluşturma anında genelde null; firma seçilince dolar (Faz 29). */
  firmaAdi?: string | null
  firmaSlug?: string | null
  takipKodu?: string | null
}

/** Fiyat teklifi — firma seçimi bu listeden yapılır. */
export type Teklif = {
  /** Sağlayıcının firma kimliği; seçim bununla yapılır. */
  firmaId: string
  firmaAdi: string
  /** Kısa ad (aras, surat, hepsijet…) — rozet/ikon için. */
  firmaSlug: string
  fiyat: number
  paraBirimi: string
}

export type SecimSonuc = {
  firmaAdi: string
  firmaSlug: string
  fiyat: number | null
  takipKodu: string | null
  durum: KargoDurumu
  durumHam: string
}

export type GonderiDurum = {
  durum: KargoDurumu
  durumHam: string
  takipKodu: string | null
  firmaAdi: string | null
  firmaSlug: string | null
  fiyat: number | null
}

export type WebhookSonuc =
  | {
      ok: true
      /** Sağlayıcının gönderi kimliği — kaydı bununla buluruz. */
      saglayiciGonderiId: string
      durum: KargoDurumu
      durumHam: string
      /** Tekrar gönderimlerde aynı olayı iki kez işlememek için. */
      idempotencyKey: string | null
      takipKodu: string | null
      olayZamani: string | null
      not: string | null
    }
  | { ok: false; hata: string; status: 400 | 401 }

export type Bakiye = { tutar: number; paraBirimi: string } | null

export interface CarrierProvider {
  /** Kayıtlarda ve webhook yolunda kullanılan kimlik: 'kargonomi' | 'mock'. */
  readonly slug: string
  /** Panelde gösterilen ad. */
  readonly ad: string
  /** Token/secret eksikse false — panel düğmeleri buna göre pasifleşir. */
  readonly hazir: boolean

  createShipment(girdi: GonderiOlusturGirdi): Promise<GonderiOlusturSonuc>
  getRates(saglayiciGonderiId: string): Promise<Teklif[]>
  /** firmaId null ise sağlayıcı en ucuzu seçer. */
  selectCarrier(saglayiciGonderiId: string, firmaId: string | null): Promise<SecimSonuc>
  getLabelPdf(saglayiciGonderiId: string): Promise<{ base64: string }>
  cancelShipment(saglayiciGonderiId: string): Promise<{ durum: KargoDurumu; durumHam: string }>
  fetchShipment(saglayiciGonderiId: string): Promise<GonderiDurum>
  /** İmza doğrulaması dahil — gövde ham metin olarak verilir. */
  parseWebhook(hamGovde: string, basliklar: Headers): WebhookSonuc
  /** Sağlayıcı durum kodunu iç duruma çevirir. */
  mapStatus(durumHam: string): KargoDurumu
  /** Bakiye desteklemeyen sağlayıcıda null. */
  getBalance(): Promise<Bakiye>
}
