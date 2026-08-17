import { createServiceClient } from '@/lib/supabase/service'

/**
 * Veri sorumlusu künyesi (Faz 12 hukuki tamamlama).
 *
 * Değerler site_content'te ayrı anahtarlarda tutulur; panelden doldurulur.
 * Boş anahtar sayfada BASILMAZ (yanlış/eksik künye basmaktansa hiç basmamak
 * doğrudur) ve panelde "eksik" uyarısı görünür.
 */

export const KUNYE_ANAHTARLARI = [
  {
    key: 'veri_sorumlusu_unvan',
    etiket: 'Unvan',
    ipucu: 'Ticari unvan ya da ad soyad (ör. NB Steelora — Nalan Bolat)',
    zorunlu: true,
  },
  {
    key: 'veri_sorumlusu_adres',
    etiket: 'Adres',
    ipucu: 'Açık adres: mahalle, cadde, no, ilçe/il',
    zorunlu: true,
  },
  {
    key: 'veri_sorumlusu_iletisim',
    etiket: 'İletişim',
    ipucu: 'E-posta ve telefon (ör. info@nbsteelora.com · 0505 198 4646)',
    zorunlu: true,
  },
  {
    key: 'veri_sorumlusu_vergi',
    etiket: 'Vergi no / MERSİS',
    ipucu: 'Varsa vergi dairesi + numara ve MERSİS numarası; yoksa boş bırakın',
    zorunlu: false,
  },
  {
    key: 'veri_sorumlusu_kep',
    etiket: 'KEP adresi',
    ipucu: 'Kayıtlı Elektronik Posta adresi (başvuru kanalı olarak yazılır); yoksa boş bırakın',
    zorunlu: false,
  },
  {
    key: 'veri_sorumlusu_vergi_dairesi',
    etiket: 'Vergi dairesi',
    ipucu: 'Ör. İstiklal Vergi Dairesi',
    zorunlu: false,
  },
  {
    key: 'veri_sorumlusu_mersis',
    etiket: 'MERSİS numarası',
    ipucu: 'Şirketse 16 haneli MERSİS numarası; şahıs işletmesinde boş bırakılabilir',
    zorunlu: false,
  },
  {
    key: 'veri_sorumlusu_etbis',
    etiket: 'ETBİS kayıt/doğrulama',
    ipucu: 'ETBİS kayıt numarası ya da doğrulama bağlantısı (https://...)',
    zorunlu: false,
  },
] as const

export type Kunye = {
  unvan: string
  adres: string
  iletisim: string
  vergi: string
  kep: string
  vergiDairesi: string
  mersis: string
  etbis: string
  /** Doldurulması gereken ama boş kalan zorunlu anahtarlar. */
  eksikler: string[]
  /** Künyede gösterilecek en az bir alan var mı? */
  doluMu: boolean
}

export async function kunyeGetir(): Promise<Kunye> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('site_content')
    .select('key, value')
    .in('key', KUNYE_ANAHTARLARI.map((k) => k.key))

  const harita = Object.fromEntries((data || []).map((r: any) => [r.key, (r.value || '').trim()]))
  const al = (k: string) => harita[k] || ''

  const eksikler = KUNYE_ANAHTARLARI.filter((k) => k.zorunlu && !al(k.key)).map((k) => k.etiket)

  return {
    unvan: al('veri_sorumlusu_unvan'),
    adres: al('veri_sorumlusu_adres'),
    iletisim: al('veri_sorumlusu_iletisim'),
    vergi: al('veri_sorumlusu_vergi'),
    kep: al('veri_sorumlusu_kep'),
    vergiDairesi: al('veri_sorumlusu_vergi_dairesi'),
    mersis: al('veri_sorumlusu_mersis'),
    etbis: al('veri_sorumlusu_etbis'),
    eksikler,
    doluMu: Boolean(al('veri_sorumlusu_unvan') || al('veri_sorumlusu_adres') || al('veri_sorumlusu_iletisim')),
  }
}

/** Künye bloğunun HTML'i; hiçbir alan doluysa basılır, hepsi boşsa boş döner. */
export function kunyeHtml(k: Kunye): string {
  if (!k.doluMu) return ''
  const satir = (etiket: string, deger: string) =>
    deger ? `<p style="margin:0"><strong>${etiket}:</strong> ${deger}</p>` : ''
  const etbisSatiri = k.etbis
    ? k.etbis.startsWith('http')
      ? `<p style="margin:0"><strong>ETBİS:</strong> <a href="${k.etbis}" target="_blank" rel="noopener noreferrer">Kayıt doğrulama</a></p>`
      : satir('ETBİS kayıt no', k.etbis)
    : ''
  return `
<h2>Veri Sorumlusu</h2>
<div>
${satir('Unvan', k.unvan)}
${satir('Adres', k.adres)}
${satir('İletişim', k.iletisim)}
${satir('Vergi dairesi / no', [k.vergiDairesi, k.vergi].filter(Boolean).join(' — '))}
${satir('MERSİS', k.mersis)}
${satir('KEP', k.kep)}
${etbisSatiri}
</div>`.trim()
}
