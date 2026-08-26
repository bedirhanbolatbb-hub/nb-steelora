'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PButton, PInput, PTextarea, PSayfaNotu } from '../_components/ui'
import { useToast } from '../_components/overlays'
import MetinOner from '../_components/MetinOner'
import MediaUpload from '../_components/MediaUpload'
import { kategoriTanitimi } from '@/lib/metin/kategoriMetni'
import { CATEGORIES } from '@/lib/catalog/categories'
import HeroCinema from '@/components/home/HeroCinema'
import {
  HERO_SABLONLARI,
  heroSablonuUygula,
  type HeroBaglami,
  type HeroSablonu,
} from '@/lib/metin/heroSablonlari'

/**
 * Site Metinleri — Faz 22'de baştan yazıldı.
 *
 * ESKİ HÂLİN KUSURU: sayfa mağaza sahibi için değil yazılımcı için
 * hazırlanmıştı. Her alanın yanında teknik anahtar yazıyordu
 * (`marquee_text`, `hero_badge`), "eyebrow" gibi terimler geçiyordu, her
 * alanın AYRI kaydet düğmesi vardı ve doldurulduğu hâlde vitrinde hiçbir
 * yerde görünmeyen alanlar duruyordu.
 *
 * ARAŞTIRMADAN GELEN KURALLAR (Shopify Polaris + Shopify tema ayarları):
 *  · Teknik anahtar (`id`) kullanıcıya ASLA gösterilmez; kullanıcı `label`
 *    görür. Bu mimari bir ayrım, süsleme değil.
 *  · Etiket kısa ve isim hâlinde (1-3 kelime), cümle düzeninde.
 *  · Yardım metni amacı açıklar; biçimli girdilerde örnek "Örnek:" ile verilir.
 *  · Serbest metin alanlarında placeholder KULLANILMAZ — yardım metni kullanılır
 *    (placeholder yazmaya başlayınca kayboluyor ve kontrast sorunu yaratıyor).
 *  · İlgili ayarlar başlık altında gruplanır, grup neyi etkilediğini söyler.
 *  · TEK kaydet: değişen alanlar bir arada kaydedilir (contextual save bar).
 */

type Alan = {
  anahtar: string
  etiket: string
  yardim: string
  ornek?: string
  cokSatir?: boolean
  /** 'gorsel' → metin kutusu yerine yükleyici + önizleme (Faz 11B). */
  tur?: 'metin' | 'gorsel'
}

type Grup = {
  baslik: string
  neyiEtkiler: string
  alanlar: Alan[]
}

const KATEGORI_TANITIM_ALANLARI: Alan[] = [
  { anahtar: 'kategori_tanitim_tum-urunler', etiket: 'Tüm ürünler', yardim: 'Tüm ürünler sayfasının başlığı altındaki tanıtım cümlesi.' },
  ...CATEGORIES.map((c) => ({
    anahtar: `kategori_tanitim_${c.slug}`,
    etiket: c.title,
    yardim: `${c.title} kategorisi sayfasının başlığı altındaki tanıtım cümlesi.`,
  })),
]

const GRUPLAR: Grup[] = [
  {
    baslik: 'Ana sayfa — açılış bölümü',
    neyiEtkiler:
      'Ana sayfayı açan büyük fotoğrafın üzerindeki yazılar. Ziyaretçinin gördüğü ilk şey burasıdır.',
    alanlar: [
      {
        anahtar: 'hero_badge',
        etiket: 'Üst etiket',
        yardim: 'Başlığın üzerindeki küçük yazı. Boş bırakılabilir. Örnek: YENİ KOLEKSİYON',
      },
      { anahtar: 'hero_title_line1', etiket: 'Başlık — 1. satır', yardim: 'Büyük başlığın ilk satırı. Örnek: Her anın' },
      { anahtar: 'hero_title_line2', etiket: 'Başlık — 2. satır', yardim: 'İkinci satır. Örnek: zarif' },
      { anahtar: 'hero_title_line3', etiket: 'Başlık — 3. satır', yardim: 'Üçüncü satır. Boş bırakılabilir. Örnek: tanığı' },
      {
        anahtar: 'hero_description',
        etiket: 'Alt açıklama',
        yardim: 'Başlığın altındaki tek cümle. Örnek: 316L medikal çelik. Kararmaz, paslanmaz, solmaz.',
        cokSatir: true,
      },
      { anahtar: 'hero_cta', etiket: 'Düğme yazısı', yardim: 'Fotoğrafın üzerindeki düğme. Örnek: Koleksiyonu Keşfet' },
    ],
  },
  {
    baslik: 'Kategori tanıtımları',
    neyiEtkiler:
      'Kategori sayfalarında başlığın hemen altında görünen tek cümle. Boş bırakırsanız o sayfada cümle hiç basılmaz.',
    alanlar: KATEGORI_TANITIM_ALANLARI,
  },
  {
    baslik: 'İade ve iletişim',
    neyiEtkiler:
      'İade akışında müşteriye gönderilen e-postalarda ve kargo/iade sayfasında kullanılır.',
    alanlar: [
      {
        anahtar: 'iade_kargo_firmasi',
        etiket: 'İade kargo firması',
        yardim:
          'İsteğe bağlı. Boş bırakın: her iadede firma, siparişin gidiş gönderisinden önerilir ve panelden seçilir. Yalnız her iadede aynı firmayı kullanıyorsanız doldurun.',
      },
      {
        anahtar: 'iade_kargo_kodu',
        etiket: 'İade kargo kodu',
        yardim:
          'İsteğe bağlı. Kod firmaya göre değişir; her iade için Kargonomi panelinden üretilip onay ekranına girilir.',
      },
      {
        anahtar: 'yanit_suresi_taahhudu',
        etiket: 'Yanıt süresi',
        yardim: 'Kargo ve iade sayfasında yazar. Boş bırakırsanız cümle hiç basılmaz. Örnek: 1 iş günü',
      },
      { anahtar: 'bildirim_eposta', etiket: 'Bildirim adresi', yardim: 'Yeni sipariş, iade ve yorum bildirimleri bu adrese gider.' },
    ],
  },
  {
    baslik: 'İlk sipariş kuponu',
    neyiEtkiler:
      'Otomatik bir indirim kampanyası YOKKEN duyuru şeridinde, sepette ve bülten teşekkürlerinde görünür. Kampanya varken hiç gösterilmez.',
    alanlar: [
      { anahtar: 'ilk_siparis_kupon_kodu', etiket: 'Kupon kodu', yardim: 'Duyurulacak kod. Örnek: HOSGELDIN10' },
      {
        anahtar: 'ilk_siparis_serit_metni',
        etiket: 'Duyuru şeridi yazısı',
        yardim: '{kod} ve {oran} yazdığınız yere gerçek değerler gelir. Örnek: İlk siparişinize özel %{oran} — kod: {kod}',
      },
      { anahtar: 'ilk_siparis_sepet_metni', etiket: 'Sepet hatırlatması', yardim: 'Kupon kutusunun altında görünür.', cokSatir: true },
      { anahtar: 'ilk_siparis_bulten_metni', etiket: 'Bülten teşekkürü', yardim: 'Bültene abone olan kişiye gösterilir.', cokSatir: true },
    ],
  },
  {
    baslik: 'Sosyal hesaplar',
    neyiEtkiler: 'Alt bilgide simge olarak görünür. Boş bıraktığınız hesap hiç basılmaz.',
    alanlar: [
      { anahtar: 'instagram_url', etiket: 'Instagram', yardim: 'Tam adres. Örnek: https://instagram.com/nbsteelora' },
      { anahtar: 'facebook_url', etiket: 'Facebook', yardim: 'Tam adres.' },
      { anahtar: 'x_url', etiket: 'X', yardim: 'Tam adres.' },
    ],
  },
  {
    baslik: 'Satıcı künyesi',
    neyiEtkiler:
      'Alt bilgide, mesafeli satış sözleşmesinde, ön bilgilendirme formunda ve cayma formunda basılır. Yasal olarak zorunludur.',
    alanlar: [
      { anahtar: 'veri_sorumlusu_unvan', etiket: 'Ticari unvan', yardim: 'Ticaret sicilindeki tam unvan.' },
      { anahtar: 'veri_sorumlusu_adres', etiket: 'Açık adres', yardim: 'İade gönderileri bu adrese yapılır.', cokSatir: true },
      { anahtar: 'veri_sorumlusu_eposta', etiket: 'E-posta', yardim: 'Müşterinin size ulaşacağı adres.' },
      { anahtar: 'veri_sorumlusu_telefon', etiket: 'Telefon', yardim: 'Yalnız iletişim bölümünde basılır.' },
      { anahtar: 'veri_sorumlusu_vergi_dairesi', etiket: 'Vergi dairesi', yardim: '' },
      { anahtar: 'veri_sorumlusu_vergi', etiket: 'Vergi numarası', yardim: '' },
      { anahtar: 'veri_sorumlusu_mersis', etiket: 'MERSİS numarası', yardim: '' },
      { anahtar: 'veri_sorumlusu_kep', etiket: 'KEP adresi', yardim: 'Kayıtlı elektronik posta. Varsa doldurun.' },
      {
        anahtar: 'veri_sorumlusu_etbis',
        etiket: 'ETBİS doğrulama adresi',
        yardim:
          'https:// ile başlayan tam adres yazarsanız alt bilgide TIKLANABİLİR rozet olur. Örnek: https://etbis.eticaret.gov.tr/sitedogrulama/…',
      },
    ],
  },
  {
    baslik: 'Hukuki metinler',
    neyiEtkiler:
      'Çerez politikası, KVKK aydınlatma metni ve mesafeli satış sözleşmesi sayfalarının altındaki sürüm satırında görünür.',
    alanlar: [
      { anahtar: 'cerez_politikasi', etiket: 'Çerez politikası', yardim: 'Sayfanın giriş metni.', cokSatir: true },
      {
        anahtar: 'cerez_politikasi_surum',
        etiket: 'Çerez politikası sürümü',
        yardim:
          'Boş bırakırsanız otomatik sürüm kullanılır. Metni esaslı değiştirdiğinizde artırın — müşteriye çerez tercihi yeniden sorulur.',
      },
      {
        anahtar: 'cerez_politikasi_yururluk',
        etiket: 'Çerez politikası yürürlük tarihi',
        yardim: 'Boş bırakırsanız otomatik tarih kullanılır. Örnek: 2026-08-23',
      },
      {
        anahtar: 'kvkk_surum',
        etiket: 'KVKK metni sürümü',
        yardim: 'Boş bırakırsanız otomatik sürüm kullanılır.',
      },
      {
        anahtar: 'kvkk_yururluk',
        etiket: 'KVKK metni yürürlük tarihi',
        yardim: 'Boş bırakırsanız otomatik tarih kullanılır. Örnek: 2026-08-23',
      },
      {
        anahtar: 'mesafeli_surum',
        etiket: 'Mesafeli satış sözleşmesi sürümü',
        yardim:
          'Boş bırakırsanız otomatik sürüm kullanılır. Müşterinin onayladığı sürüm siparişe kaydedilir.',
      },
      {
        anahtar: 'mesafeli_yururluk',
        etiket: 'Mesafeli satış sözleşmesi yürürlük tarihi',
        yardim: 'Boş bırakırsanız otomatik tarih kullanılır. Örnek: 2026-08-23',
      },
      { anahtar: 'hesap_silme_metni', etiket: 'Hesap silme açıklaması', yardim: 'Hesabım ekranında silme bölümünde görünür.', cokSatir: true },
    ],
  },
  {
    baslik: 'Hakkımızda — fotoğraflar',
    neyiEtkiler:
      'Hakkımızda sayfasındaki iki fotoğraf. Boş bırakırsanız o bölüm fotoğrafsız ama dengeli görünür; yer tutucu bir görsel basılmaz.',
    alanlar: [
      {
        anahtar: 'hakkimizda_gorsel_atolye',
        etiket: 'Atölye / kurucu fotoğrafı',
        yardim: 'Marka anlatısının yanında, dikey durur. Dikey (4:5) kareler en iyi oturur.',
        tur: 'gorsel',
      },
      {
        anahtar: 'hakkimizda_gorsel_paket',
        etiket: 'Hediye paketi fotoğrafı',
        yardim: '"Kutusundan çıktığı an" bölümünde yatay durur. Yatay (4:3) kareler en iyi oturur.',
        tur: 'gorsel',
      },
    ],
  },
  {
    baslik: 'Panel notları',
    neyiEtkiler: 'Yalnız sizin göreceğiniz not; vitrinde görünmez.',
    alanlar: [{ anahtar: 'analiz_notu', etiket: 'Analiz notu', yardim: 'Analiz ekranının başında görünür.', cokSatir: true }],
  },
]

function AlanKutusu({
  alan,
  deger,
  degisti,
  onDegis,
}: {
  alan: Alan
  deger: string
  degisti: boolean
  onDegis: (anahtar: string, deger: string) => void
}) {
  const kategoriSlug = alan.anahtar.startsWith('kategori_tanitim_')
    ? alan.anahtar.replace('kategori_tanitim_', '')
    : null

  return (
    <div className={degisti ? 'rounded-[4px] bg-[#f5efe2]/60 p-2 -m-2' : undefined}>
      <label
        htmlFor={`alan-${alan.anahtar}`}
        className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]"
      >
        {alan.etiket}
        {degisti && <span className="ml-2 text-[10px] font-normal text-[var(--p-accent-deep)]">kaydedilmedi</span>}
      </label>
      {alan.tur === 'gorsel' ? (
        // Görsel alanı: mevcut medya yükleme düzeni (MediaUpload) kullanılır —
        // dosya istemcide küçültülür, URL site_content'e METİN olarak yazılır.
        // Kaydetme akışı diğer alanlarla aynı: tek "Kaydet" düğmesi.
        <div className="space-y-2">
          {deger ? (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deger}
                alt=""
                className="h-24 w-24 rounded-[4px] border border-[var(--p-line)] object-cover"
              />
              <button
                type="button"
                onClick={() => onDegis(alan.anahtar, '')}
                className="text-[12px] text-[var(--p-muted)] underline underline-offset-4 hover:text-[var(--p-ink)]"
              >
                Kaldır
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--p-muted)]">Fotoğraf yok — bölüm fotoğrafsız görünür.</p>
          )}
          <MediaUpload
            onUploaded={(url) => onDegis(alan.anahtar, url)}
            etiket={deger ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}
          />
        </div>
      ) : alan.cokSatir ? (
        <PTextarea id={`alan-${alan.anahtar}`} rows={2} value={deger} onChange={(e) => onDegis(alan.anahtar, e.target.value)} />
      ) : (
        <PInput id={`alan-${alan.anahtar}`} value={deger} onChange={(e) => onDegis(alan.anahtar, e.target.value)} />
      )}
      {alan.yardim && <p className="mt-1 text-[11px] leading-relaxed text-[var(--p-muted)]">{alan.yardim}</p>}

      {kategoriSlug && (
        <MetinOner
          uret={() =>
            kategoriTanitimi(
              kategoriSlug,
              CATEGORIES.find((c) => c.slug === kategoriSlug)?.title ?? alan.etiket
            )
          }
          onSec={(m) => onDegis(alan.anahtar, m)}
        />
      )}
    </div>
  )
}

/**
 * Hero hazır şablonları + GERÇEK önizleme (Faz 22).
 *
 * Önizleme vitrindeki HeroCinema bileşeninin ta kendisi — panelde ayrı bir
 * taklit çizilmiyor, dolayısıyla "panelde başka, sitede başka" ihtimali yok.
 * Fotoğraf kürasyondan geldiği için önizlemede yok; bileşen o durumda zaten
 * tipografi düzenine düşüyor.
 */
function HeroSablonKutusu({
  baglam,
  degerler,
  onUygula,
}: {
  baglam: HeroBaglami
  degerler: Record<string, string>
  onUygula: (alanlar: Record<string, string>) => void
}) {
  const [sira, setSira] = useState(0)
  const [secili, setSecili] = useState<HeroSablonu['kimlik'] | null>(null)
  const [cihaz, setCihaz] = useState<'masaustu' | 'telefon'>('masaustu')

  const uygula = (kimlik: HeroSablonu['kimlik'], yeniSira: number) => {
    setSecili(kimlik)
    setSira(yeniSira)
    onUygula(heroSablonuUygula(kimlik, baglam, yeniSira) as unknown as Record<string, string>)
  }

  const genislik = cihaz === 'masaustu' ? 1280 : 390
  const olcek = cihaz === 'masaustu' ? 0.42 : 0.62

  return (
    <div className="mb-5 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface-muted)] p-3">
      <p className="text-[12px] font-medium text-[var(--p-ink)]">Hazır şablon</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--p-muted)]">
        Şablon seçin, aşağıdaki alanlar bir kerede dolsun. Sonra dilediğinizi elle
        değiştirebilirsiniz. Fotoğraf Kürasyon ekranından seçilir.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {HERO_SABLONLARI.map((sablon) => (
          <button
            key={sablon.kimlik}
            type="button"
            onClick={() => uygula(sablon.kimlik, secili === sablon.kimlik ? sira + 1 : 0)}
            className={
              'rounded-[4px] border px-3 py-2 text-left transition-colors ' +
              (secili === sablon.kimlik
                ? 'border-[var(--p-accent-line)] bg-[var(--p-surface)]'
                : 'border-[var(--p-line)] bg-[var(--p-surface)] hover:border-[var(--p-accent-line)]')
            }
          >
            <span className="block text-[12px] font-medium text-[var(--p-ink)]">
              {sablon.ad}
              {secili === sablon.kimlik && (
                <span className="ml-1 text-[10px] font-normal text-[var(--p-accent-deep)]">· başka öner</span>
              )}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--p-muted)]">
              {sablon.aciklama}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <p className="text-[11px] text-[var(--p-muted)]">Önizleme</p>
        <div className="ml-auto flex gap-1">
          {(['masaustu', 'telefon'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCihaz(c)}
              className={
                'rounded-[4px] px-2 py-1 text-[11px] ' +
                (cihaz === c
                  ? 'bg-[var(--p-ink)] text-[var(--p-surface)]'
                  : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]')
              }
            >
              {c === 'masaustu' ? 'Masaüstü' : 'Telefon'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-[4px] border border-[var(--p-line)] bg-white">
        <div style={{ height: (cihaz === 'masaustu' ? 620 : 700) * olcek }}>
          <div
            style={{
              width: genislik,
              transform: `scale(${olcek})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <HeroCinema c={degerler} image={null} imageHref={null} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SiteMetinleriClient({
  metinler,
  heroBaglami,
}: {
  metinler: { key: string; value: string }[]
  heroBaglami: HeroBaglami
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const orijinal = useMemo(() => Object.fromEntries(metinler.map((m) => [m.key, m.value])), [metinler])
  const [degerler, setDegerler] = useState<Record<string, string>>(orijinal)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const degisenler = useMemo(
    () => Object.keys(degerler).filter((k) => (degerler[k] ?? '') !== (orijinal[k] ?? '')),
    [degerler, orijinal]
  )

  const degistir = useCallback((anahtar: string, deger: string) => {
    setDegerler((o) => ({ ...o, [anahtar]: deger }))
  }, [])

  // TEK KAYDET: değişen alanlar bir arada gönderilir. Alan başına kaydet
  // düğmesi, on alanı değiştiren birinin on kez tıklamasını gerektiriyordu.
  const hepsiniKaydet = async () => {
    if (degisenler.length === 0) return
    setKaydediliyor(true)
    const basarisiz: string[] = []
    for (const key of degisenler) {
      try {
        const res = await fetch('/api/panel/content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: degerler[key] ?? '' }),
        })
        if (!res.ok) basarisiz.push(key)
      } catch {
        basarisiz.push(key)
      }
    }
    setKaydediliyor(false)
    if (basarisiz.length === 0) {
      toast(`${degisenler.length} alan kaydedildi — vitrin birkaç dakika içinde güncellenir`, 'success')
      router.refresh()
    } else {
      toast(`${basarisiz.length} alan kaydedilemedi`, 'danger')
    }
  }

  const vazgec = () => setDegerler(orijinal)

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      <PSayfaNotu>
        Vitrinde geçen sabit yazıları — başlıklar, açıklamalar, kargo ve iade bilgileri —
        buradan düzenlersiniz.
      </PSayfaNotu>
      <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-3 text-[12px] leading-relaxed text-[var(--p-ink-soft)]">
        Buradaki yazılar sitenin sabit metinleridir. Değişiklikler kaydedildikten sonra
        vitrine birkaç dakika içinde yansır.{' '}
        <span className="text-[var(--p-muted)]">
          Yazı tipi, punto ve renkler burada ayarlanmaz — tasarım dili markanın parçasıdır ve
          sabittir.
        </span>
      </p>

      {GRUPLAR.map((grup) => (
        <section key={grup.baslik} className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-4">
          <h2 className="text-[14px] font-medium text-[var(--p-ink)]">{grup.baslik}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--p-muted)]">{grup.neyiEtkiler}</p>
          {grup.baslik === 'Ana sayfa — açılış bölümü' && (
            <div className="mt-4">
              <HeroSablonKutusu
                baglam={heroBaglami}
                degerler={degerler}
                onUygula={(alanlar) => setDegerler((o) => ({ ...o, ...alanlar }))}
              />
            </div>
          )}
          <div className="mt-4 space-y-4">
            {grup.alanlar.map((alan) => (
              <AlanKutusu
                key={alan.anahtar}
                alan={alan}
                deger={degerler[alan.anahtar] ?? ''}
                degisti={(degerler[alan.anahtar] ?? '') !== (orijinal[alan.anahtar] ?? '')}
                onDegis={degistir}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Kaydedilmemiş değişiklik çubuğu — Shopify'ın contextual save bar deseni. */}
      {degisenler.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--p-line)] bg-[var(--p-surface)]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="text-[13px] text-[var(--p-ink)]">
              <strong>{degisenler.length}</strong> alan değişti, kaydedilmedi
            </p>
            <div className="ml-auto flex gap-2">
              <PButton variant="ghost" onClick={vazgec} disabled={kaydediliyor}>
                Geri al
              </PButton>
              <PButton onClick={hepsiniKaydet} disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </PButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
