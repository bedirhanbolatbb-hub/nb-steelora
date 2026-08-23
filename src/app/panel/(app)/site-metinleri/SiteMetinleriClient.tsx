'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { PButton, PCard, PInput, PTextarea } from '../_components/ui'
import { useToast } from '../_components/overlays'

/**
 * Anahtar → insan etiketi + açıklama. Bilinmeyen anahtarlar da düzenlenebilir
 * (etiket yerine anahtar adı basılır) — panel veri kaybettirmez.
 */
const ETIKETLER: Record<string, { etiket: string; not?: string; genis?: boolean }> = {
  iade_kargo_firmasi: {
    etiket: 'İade kargo firması (isteğe bağlı)',
    not: 'Boş bırakın — her iadede firma, siparişin gidiş gönderisinden önerilir ve panelden seçilir. Yalnız her iadede aynı firmayı kullanıyorsanız doldurun.',
  },
  iade_kargo_kodu: {
    etiket: 'İade kargo kodu (isteğe bağlı)',
    not: 'Boş bırakın — kod firmaya göre değişir, her iade için Kargonomi panelinden üretilip onay ekranına girilir.',
  },
  yanit_suresi_taahhudu: {
    etiket: 'Yanıt süresi taahhüdü',
    not: 'ör. "1 iş günü". Boşken kargo/iade sayfasında bu cümle hiç basılmaz.',
  },
  marquee_text: { etiket: 'Kayan şerit (marquee)', not: 'Vitrinde birkaç dakikada güncellenir.', genis: true },
  promo_bar_text: { etiket: 'Promo çubuğu metni', not: 'Vitrinde birkaç dakikada güncellenir.' },
  promo_bar_emoji: { etiket: 'Promo çubuğu emojisi' },
  hero_badge: { etiket: 'Hero — eyebrow rozeti' },
  hero_title_line1: { etiket: 'Hero — başlık 1. satır' },
  hero_title_line2: { etiket: 'Hero — başlık 2. satır (italik)' },
  hero_title_line3: { etiket: 'Hero — başlık 3. satır' },
  hero_description: { etiket: 'Hero — açıklama', genis: true },
  hero_cta: { etiket: 'Hero — buton metni' },
  hero_single_mode: { etiket: 'Hero tek görsel modu', not: "'true' ya da 'false'" },
  categories_title: { etiket: 'Kategoriler bölüm başlığı' },
  featured_order: { etiket: 'Öne çıkanlar sıra anahtarı (teknik)' },
  instagram_url: { etiket: 'Instagram adresi', not: 'Boşsa vitrinde ikon ve şema alanı basılmaz.' },
  facebook_url: { etiket: 'Facebook adresi', not: 'Boşsa vitrinde ikon ve şema alanı basılmaz.' },
  x_url: { etiket: 'X (Twitter) adresi', not: 'Boşsa vitrinde ikon ve şema alanı basılmaz.' },
  // Hukuki metinler (Faz 12) — KVKK zorunlu unsurları
  veri_sorumlusu_unvan: { etiket: 'Veri sorumlusu — unvan', not: 'ZORUNLU. Ticari unvan ya da ad soyad. Boşsa künye eksik basılır.' },
  veri_sorumlusu_adres: { etiket: 'Veri sorumlusu — adres', not: 'ZORUNLU. Açık adres (mahalle, cadde, no, ilçe/il).', genis: true },
  veri_sorumlusu_eposta: { etiket: 'Veri sorumlusu — e-posta', not: 'ZORUNLU. YALNIZ e-posta adresi; KVKK başvuru kanallarında bu basılır.' },
  veri_sorumlusu_telefon: { etiket: 'Veri sorumlusu — telefon', not: 'ZORUNLU. YALNIZ telefon; satıcı bilgilerinde ve iletişimde basılır.' },
  veri_sorumlusu_iletisim: { etiket: 'Veri sorumlusu — iletişim (eski)', not: 'Kullanımdan kalktı. Yukarıdaki e-posta ve telefon alanlarını doldurun.' },
  veri_sorumlusu_vergi: { etiket: 'Vergi no / MERSİS', not: 'Varsa yazın; boşsa sayfada hiç basılmaz.' },
  veri_sorumlusu_kep: { etiket: 'KEP adresi', not: 'Varsa yazın; KVKK başvuru kanalı olarak listelenir.' },
  veri_sorumlusu_vergi_dairesi: { etiket: 'Vergi dairesi', not: 'Ör. İstiklal Vergi Dairesi. Boşsa basılmaz.' },
  veri_sorumlusu_mersis: { etiket: 'MERSİS numarası', not: 'Şirketse 16 hane; şahıs işletmesinde boş bırakılabilir.' },
  veri_sorumlusu_etbis: { etiket: 'ETBİS kayıt/doğrulama', not: 'Kayıt numarası ya da https:// ile doğrulama bağlantısı.' },
  cerez_politikasi: { etiket: 'Çerez Politikası — giriş bölümü', not: 'HTML. Boşsa taslak metin basılır. Zorunlu bölümler (tablo, haklar, yurt dışı) koddan gelir.', genis: true },
  cerez_politikasi_surum: { etiket: 'Çerez Politikası — sürüm', not: "Rıza kaydındaki sürümle AYNI olmalı (şu an: v1.0). Boşsa koddaki sürüm basılır." },
  cerez_politikasi_yururluk: { etiket: 'Çerez Politikası — yürürlük tarihi', not: 'GG.AA.YYYY biçiminde (ör. 17.08.2026). Boşsa satır hiç basılmaz.' },
  analiz_notu: { etiket: 'Analiz sayfası notu', not: 'Analiz sayfasının üstünde tek satır olarak basılır. Boşaltırsanız satır tamamen kalkar.', genis: true },
  hesap_silme_metni: { etiket: 'Hesap silme bölümü', not: 'HTML. KVKK ve Çerez Politikası sayfalarında basılır. Boşsa koddaki varsayılan metin görünür.', genis: true },
}

const GRUPLAR: { baslik: string; anahtarlar: string[] }[] = [
  { baslik: 'Duyurular', anahtarlar: ['marquee_text', 'promo_bar_text', 'promo_bar_emoji'] },
  {
    baslik: 'Hero',
    anahtarlar: ['hero_badge', 'hero_title_line1', 'hero_title_line2', 'hero_title_line3', 'hero_description', 'hero_cta', 'hero_single_mode'],
  },
  { baslik: 'Sosyal bağlantılar', anahtarlar: ['instagram_url', 'facebook_url', 'x_url'] },
  {
    baslik: 'Hukuki — veri sorumlusu künyesi',
    anahtarlar: [
      'veri_sorumlusu_unvan',
      'veri_sorumlusu_adres',
      'veri_sorumlusu_eposta',
      'veri_sorumlusu_telefon',
      'veri_sorumlusu_vergi_dairesi',
      'veri_sorumlusu_vergi',
      'veri_sorumlusu_mersis',
      'veri_sorumlusu_kep',
      'veri_sorumlusu_etbis',
    ],
  },
  {
    baslik: 'Hukuki — çerez politikası',
    anahtarlar: ['cerez_politikasi', 'cerez_politikasi_surum', 'cerez_politikasi_yururluk'],
  },
  {
    baslik: 'Hukuki — hesap silme',
    anahtarlar: ['hesap_silme_metni'],
  },
  {
    baslik: 'İlk sipariş kuponu',
    anahtarlar: [
      'ilk_siparis_kupon_kodu',
      'ilk_siparis_serit_metni',
      'ilk_siparis_sepet_metni',
      'ilk_siparis_bulten_metni',
    ],
  },
  {
    baslik: 'İade ve iletişim',
    anahtarlar: ['iade_kargo_firmasi', 'iade_kargo_kodu', 'yanit_suresi_taahhudu'],
  },
  { baslik: 'Panel — analiz', anahtarlar: ['analiz_notu'] },
  { baslik: 'Diğer', anahtarlar: [] },
]


/**
 * Tek bir metin alanı — MODÜL seviyesinde tanımlıdır.
 *
 * Daha önce bu bileşen SiteMetinleriClient'ın içinde tanımlıydı: her tuş
 * vuruşunda üst bileşen yeniden render olunca `Alan` yeni bir fonksiyon
 * referansı oluyor, React bunu farklı bir bileşen tipi sayıp input'u
 * unmount/remount ediyordu — yazarken odak kayboluyordu. Dışarı taşındığı
 * için tip artık sabit; input DOM'da kalır.
 */
function Alan({
  anahtar,
  deger,
  orijinalDeger,
  kaydediliyor,
  onDegis,
  onKaydet,
}: {
  anahtar: string
  deger: string
  orijinalDeger: string
  kaydediliyor: boolean
  onDegis: (anahtar: string, deger: string) => void
  onKaydet: (anahtar: string) => void
}) {
  const meta = ETIKETLER[anahtar] ?? { etiket: anahtar }
  const degisti = deger !== orijinalDeger
  return (
    <div>
      <label
        htmlFor={`alan-${anahtar}`}
        className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]"
      >
        {meta.etiket} <code className="ml-1 text-[10px] text-[var(--p-muted)]">{anahtar}</code>
      </label>
      <div className="flex items-start gap-2">
        {meta.genis ? (
          <PTextarea
            id={`alan-${anahtar}`}
            rows={2}
            value={deger}
            onChange={(e) => onDegis(anahtar, e.target.value)}
          />
        ) : (
          <PInput
            id={`alan-${anahtar}`}
            value={deger}
            onChange={(e) => onDegis(anahtar, e.target.value)}
          />
        )}
        <PButton
          variant={degisti ? 'primary' : 'ghost'}
          disabled={!degisti || kaydediliyor}
          onClick={() => onKaydet(anahtar)}
        >
          {kaydediliyor ? '…' : 'Kaydet'}
        </PButton>
      </div>
      {meta.not && <p className="mt-1 text-[11px] text-[var(--p-muted)]">{meta.not}</p>}
    </div>
  )
}

export default function SiteMetinleriClient({
  metinler,
}: {
  metinler: { key: string; value: string }[]
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [degerler, setDegerler] = useState<Record<string, string>>(
    Object.fromEntries(metinler.map((m) => [m.key, m.value]))
  )
  const [kaydedilen, setKaydedilen] = useState<string | null>(null)

  const orijinal = Object.fromEntries(metinler.map((m) => [m.key, m.value]))
  const gruplu = new Set(GRUPLAR.flatMap((g) => g.anahtarlar))
  const digerleri = metinler.map((m) => m.key).filter((k) => !gruplu.has(k))

  // useCallback: Alan'a giden geri çağrılar her render'da değişmesin.
  const degistir = useCallback((anahtar: string, deger: string) => {
    setDegerler((onceki) => ({ ...onceki, [anahtar]: deger }))
  }, [])

  const kaydet = useCallback(async (key: string) => {
    setKaydedilen(key)
    try {
      const res = await fetch('/api/panel/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: degerler[key] ?? '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Kaydedildi — vitrin birkaç dakika içinde güncellenir', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydedilen(null)
  }, [degerler, router, toast])

  // KVKK künyesi eksikse panelde görünür uyarı (Faz 12 hukuki tamamlama):
  // boş alanlar hukuki metinlerde hiç basılmaz, bu yüzden fark edilmeleri gerekir.
  const ZORUNLU_KUNYE = [
    ['veri_sorumlusu_unvan', 'Unvan'],
    ['veri_sorumlusu_adres', 'Adres'],
    ['veri_sorumlusu_eposta', 'E-posta'],
    ['veri_sorumlusu_telefon', 'Telefon'],
  ] as const
  const eksikKunye = ZORUNLU_KUNYE.filter(([k]) => !(degerler[k] ?? '').trim()).map(([, e]) => e)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {eksikKunye.length > 0 && (
        <p className="rounded-[4px] border border-[var(--p-warning)]/30 bg-[var(--p-warning-bg)] px-3 py-2 text-[12px] leading-relaxed text-[var(--p-warning)]">
          <strong>Veri sorumlusu künyesi eksik:</strong> {eksikKunye.join(', ')}. KVKK gereği bu
          bilgiler Çerez Politikası ve KVKK Aydınlatma Metni'nin başında yer almalıdır; boş
          bırakılan alanlar sayfada hiç basılmaz. Aşağıdaki «Hukuki — veri sorumlusu künyesi»
          bölümünden doldurun.
        </p>
      )}
      {GRUPLAR.map((g) => {
        const anahtarlar = g.baslik === 'Diğer' ? digerleri : g.anahtarlar.filter((k) => k in orijinal)
        if (anahtarlar.length === 0) return null
        return (
          <PCard key={g.baslik} title={g.baslik}>
            <div className="space-y-4">
              {anahtarlar.map((k) => (
                <Alan
                  key={k}
                  anahtar={k}
                  deger={degerler[k] ?? ''}
                  orijinalDeger={orijinal[k] ?? ''}
                  kaydediliyor={kaydedilen === k}
                  onDegis={degistir}
                  onKaydet={kaydet}
                />
              ))}
            </div>
          </PCard>
        )
      })}
    </div>
  )
}
