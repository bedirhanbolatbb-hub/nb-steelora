'use client'

import { useState, useEffect, useRef } from 'react'
import UyelikTesvikSatiri from '@/components/store/UyelikTesvikSatiri'
import { kampanyaEtiketi } from '@/lib/campaignLabel'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { SOZLESME_SURUMU, SOZLESME_YOLLARI } from '@/lib/legal/sozlesme'
import Input from '@/components/ui/Input'
import CheckoutSteps from '@/components/store/CheckoutSteps'
import { izle } from '@/lib/analytics/izle'
import { SHIPPING_LINE_LABEL, shippingCostFor } from '@/lib/shipping'
import { useOtomatikIndirim } from '@/hooks/useOtomatikIndirim'
import KuponKutusu, { useKuponKodu } from '@/components/store/KuponKutusu'
import { kucukResim } from '@/lib/gorsel/kadraj'
import { useKadrajSorgu } from '@/components/store/KadrajContext'

/** Kart ödemesi kapalıyken kartla almak isteyene gösterilen mağaza (7 Kas 2026). */
const TRENDYOL_MAGAZA_URL = 'https://www.trendyol.com/magaza/nb-steelora-m-1181208'

export default function OdemePage() {
  const { items, totalPrice, clearCart } = useCart()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        // Auto-fill email from auth
        setForm((prev) => ({
          ...prev,
          email: prev.email || data.user!.email || '',
        }))
        // Try to load profile for name/phone
        supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setForm((prev) => ({
                ...prev,
                firstName: prev.firstName || profile.full_name?.split(' ')[0] || '',
                lastName: prev.lastName || profile.full_name?.split(' ').slice(1).join(' ') || '',
                phone: prev.phone || profile.phone || '',
              }))
            }
          })
      }
    })
  }, [])
  const [loading, setLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    district: '',
    address: '',
    zipCode: '',
  })
  const [giftNote, setGiftNote] = useState('')
  /**
   * Kurumsal fatura (Faz 28).
   *
   * TC kimlik numarasından FARKLI bir ihtiyaç: şahıs müşteriye kesilen
   * faturada kimlik numarası gerekmiyor, ama müşteri şirket adına fatura
   * isterse vergi kimlik numarası ve vergi dairesi zorunlu. Bu yüzden alan
   * herkese sorulmuyor, yalnız isteyene açılıyor.
   */
  const [kurumsalFatura, setKurumsalFatura] = useState(false)
  const [fatura, setFatura] = useState({ firma: '', vergiDairesi: '', vergiNo: '' })
  /**
   * Mesafeli satış onayı (Faz 19). Mesafeli Sözleşmeler Yönetmeliği m.5/m.6:
   * tüketici sipariş vermeden ÖNCE ön bilgilendirmeyi okuduğunu ve sözleşmeyi
   * kabul ettiğini açıkça beyan etmeli. İşaretlenmeden ödeme başlatılamaz;
   * sunucu da ayrıca doğrular, istemciye güvenilmez.
   */
  const [sozlesmeOnay, setSozlesmeOnay] = useState(false)

  const subtotal = totalPrice()

  // Auto-apply campaigns
  // Sepet özeti SUNUCUDAN gelir (Faz 17): indirim seçimi, tavan ve toplam
  // ödeme başlatma ucuyla birebir aynı fonksiyondan hesaplanır. İstemci burada
  // hiçbir tutar üretmez — Faz 15'te bulunan "ekranda başka, tahsilatta başka"
  // kusurunun kaynağı buydu.
  // Faz 25: kupon kutusu artık sepetle ORTAK bileşen ve kod localStorage'da
  // taşınıyor; müşteri sepette girdiğini burada tekrar yazmıyor.
  const [kod, setKod] = useKuponKodu()
  const kadrajMi = useKadrajSorgu()
  const kampanyaIndirimi = useVitrinIndirimi()
  const {
    ozet,
    indirim: secilenIndirim,
    kodHatasi: sunucuKodHatasi,
    kuponBilgiMi,
    kuponUygulandi,
    ilkSiparisMetni,
    havale,
  } = useOtomatikIndirim(
    items.map((i) => ({ productId: i.product.id, adet: Number(i.quantity) || 1 })),
    kod || null,
    form.email || null
  )
  const totalDiscount = ozet.indirimToplami
  // Ek havale/EFT indirimi (7 Kas 2026) — sunucu hesaplar, sipariş ucu aynı
  // fonksiyonla yeniden hesaplar; ekrandaki tutar siparişe yazılan tutardır.
  const havaleIndirimi = havale?.tutar ?? 0

  // Kargo eşiği indirimli ara toplam üzerinden — sunucudaki hesapla birebir
  // aynı olmalı, yoksa ekrandaki toplam ile çekilen tutar ayrışır (Faz 11).
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount - havaleIndirimi)
  // Kargo koşulsuz ücretsiz — sunucudaki hesapla birebir aynı tek kaynaktan.
  const shipping = shippingCostFor(discountedSubtotal)
  const total = discountedSubtotal + shipping

  // Faz 25: ayrı bir /api/discount/apply çağrısı KALDIRILDI. Kod artık
  // doğrudan sepet özeti ucuna gidiyor; kabul/ret kararı ve mesajı tek
  // yerden geliyor. İki uç iki farklı cevap verebiliyordu.

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /**
   * Havale/EFT bilgisi (7 Kas 2026). Kart ödemesi kapalı: iyzico hesabı
   * kapatılan eski firmaya aitti, yeni firmanın ödeme kuruluşu onay bekliyor.
   * Hesap sahibi sitedeki satıcıyla aynı kişidir; müşteri parayı kime
   * göndereceğini sipariş ÖNCESİ görür.
   */
  const [havaleBilgi, setHavaleBilgi] = useState<{
    hazir: boolean
    banka?: string
    alici?: string
    iban?: string
  } | null>(null)
  useEffect(() => {
    fetch('/api/odeme/havale-bilgisi', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setHavaleBilgi(d && typeof d.hazir === 'boolean' ? d : { hazir: false }))
      .catch(() => setHavaleBilgi({ hazir: false }))
  }, [])
  const havaleHazir = havaleBilgi?.hazir === true

  const isFormValid =
    form.firstName &&
    form.lastName &&
    form.email &&
    form.phone &&
    form.city &&
    form.district &&
    form.address &&
    havaleHazir &&
    sozlesmeOnay &&
    (!kurumsalFatura ||
      (fatura.firma.trim() && fatura.vergiDairesi.trim() && fatura.vergiNo.trim()))

  /** Düğme pasifken hangi alanların eksik olduğu tek satırda yazılır. */
  const eksikAlanlar = [
    !form.firstName && 'ad',
    !form.lastName && 'soyad',
    !form.email && 'e-posta',
    !form.phone && 'telefon',
    !form.city && 'il',
    !form.district && 'ilçe',
    !form.address && 'adres',
    !sozlesmeOnay && 'sözleşme onayı',
    kurumsalFatura &&
      !(fatura.firma.trim() && fatura.vergiDairesi.trim() && fatura.vergiNo.trim()) &&
      'kurumsal fatura bilgileri',
  ].filter(Boolean) as string[]

  // Ödemeye başlama ölçümü — form gönderilmeden önce bir kez (Faz 12).
  const olcumYapildi = useRef(false)
  useEffect(() => {
    if (olcumYapildi.current || items.length === 0) return
    olcumYapildi.current = true
    izle('begin_checkout', { value: subtotal, meta: { kalem: items.length } })
  }, [items.length, subtotal])

  /** İlk "Öde" denemesi yapıldı mı — eksik alan uyarısı ondan sonra çıkar. */
  const [denendi, setDenendi] = useState(false)

  const handlePayment = async () => {
    // Faz 11A: düğme artık pasif değil, çünkü pasif düğme tıklanamıyor ve
    // "ilk denemede uyar" kuralı hiç çalışmazdı. Doğrulama AYNEN duruyor:
    // form geçersizse ödeme başlamaz, yalnız uyarı görünür hâle gelir.
    setDenendi(true)
    if (!isFormValid) return
    if (!isFormValid) return
    setPaymentError('')
    setLoading(true)
    try {
      const res = await fetch('/api/odeme/havale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Fiyat sunucuda DB'den okunur (Faz 17/22); istemcinin gördüğü fiyat
          // yalnız KARŞILAŞTIRMA için gider — farklıysa sipariş açılmaz (409),
          // müşteriye "sepeti yenileyin" denir (kartlı akışla aynı davranış).
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            price: i.product.display_price,
          })),
          buyer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
          },
          shippingAddress: {
            city: form.city,
            district: form.district,
            address: form.address,
            zipCode: form.zipCode,
          },
          userId,
          giftNote: giftNote || null,
          fatura: kurumsalFatura
            ? { firma: fatura.firma, vergiDairesi: fatura.vergiDairesi, vergiNo: fatura.vergiNo }
            : null,
          discountCode: kod || null,
          sozlesmeOnay: true,
          sozlesmeSurumu: SOZLESME_SURUMU,
          // Ekranda gösterilen tutar: sunucu farklı hesaplarsa sipariş açılmaz
          // ve müşteriye güncel tutar söylenir.
          beklenenToplam: Math.round(total * 100) / 100,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success && data.orderNumber) {
        clearCart()
        router.push(
          `/siparis-tamamlandi?siparis=${encodeURIComponent(data.orderNumber)}&odeme=havale`
        )
        return
      }
      setPaymentError(data.error ? String(data.error) : 'Sipariş oluşturulamadı.')
    } catch {
      setPaymentError('Bir hata oluştu, lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }


  // Yalnız adım çizgisini boyamak için okunur; hiçbir doğrulama ya da gönderim
  // kararı buna bakmaz (isFormValid ve handlePayment aynen duruyor).
  const deliveryComplete = Boolean(
    form.firstName && form.lastName && form.email && form.phone && form.city && form.district && form.address
  )

  // Boş sepet
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 text-center">
        <p className="eyebrow">Sipariş</p>
        <h1 className="font-heading text-[32px] font-semibold text-ink mt-2 mb-4">
          Sepetiniz Boş
        </h1>
        <p className="text-muted font-body text-[13px] mb-6">
          Ödeme yapabilmek için sepetinize ürün ekleyin.
        </p>
        <a
          href="/urunler"
          className="inline-flex items-center justify-center bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
        >
          Ürünlere Git
        </a>
      </div>
    )
  }

  return (
    /* pb: mobilde ödeme bloğu ekranın altına SABİTLENİYOR; sayfanın son
       satırlarının bloğun arkasında kalmaması için alt boşluk bırakılır. */
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 pb-[200px] sm:pb-12">
      <p className="eyebrow">Sipariş</p>
      <h1 className="font-heading text-[32px] lg:text-[38px] font-semibold text-ink mt-2 mb-8">
        Ödeme
      </h1>

      {/* Salt görsel adım çizgisi; teslimat alanları tamamlanınca Ödeme'ye geçer */}
      <CheckoutSteps current={deliveryComplete ? 2 : 1} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Form — sol 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Üyelik uyarısı — sadece giriş yapılmamış kullanıcılara */}
          {!userId && (
            <div className="bg-accent-soft/60 border border-accent-line/30 p-5 rounded-[4px]">
              <p className="text-[13px] font-body font-medium text-ink mb-1">
                Üye olarak sipariş verin, daha fazlasını kazanın
              </p>
              <p className="text-[12px] font-body text-ink-soft mb-3">
                Kargo takibi, sipariş geçmişi ve özel kampanyalar için üye olun.
              </p>
              <div className="flex items-center gap-4 text-[12px] font-body">
                <a href="/giris" className="text-accent-deep underline underline-offset-4 hover:text-ink transition-colors">
                  Giriş yap
                </a>
                <a href="/kayit" className="text-accent-deep underline underline-offset-4 hover:text-ink transition-colors">
                  Üye ol
                </a>
                <span className="text-muted">veya misafir olarak devam edin ↓</span>
              </div>
            </div>
          )}

          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <p className="eyebrow">Adım 1</p>
            <h2 className="font-heading text-[20px] font-semibold text-ink mt-1 mb-5">
              Teslimat Bilgileri
            </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="Ad *"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
            <Input
              placeholder="Soyad *"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
            <Input
              placeholder="E-posta *"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <Input
              placeholder="Telefon *"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <Input
              placeholder="İl *"
              autoComplete="address-level1"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
            <Input
              placeholder="İlçe *"
              autoComplete="address-level2"
              value={form.district}
              onChange={(e) => updateField('district', e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                placeholder="Açık Adres *"
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
            <Input
              placeholder="Posta Kodu"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
            />
          </div>
          </section>

          {/* Ödeme: Havale / EFT (7 Kas 2026) — kart ödemesi geçici olarak kapalı. */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <p className="eyebrow">Adım 2</p>
            <h2 className="font-heading text-[20px] font-semibold text-ink mt-1 mb-3">
              Ödeme: Havale / EFT
            </h2>
            {havaleBilgi === null ? (
              <p className="text-[13px] font-body text-muted">Ödeme bilgileri yükleniyor…</p>
            ) : havaleHazir ? (
              <>
                <p className="text-[13px] font-body text-ink-soft leading-relaxed">
                  Siparişinizi onayladığınızda ödeme bilgileri bu ekranda ve e-postanızda yer alır.
                  Ödemeniz hesabımıza geçince siparişinizi onaylayıp kargoya hazırlarız.
                </p>
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-[4px] border border-line bg-bg px-4 py-3 text-[13px] font-body">
                  <dt className="text-muted">Alıcı</dt>
                  <dd className="text-ink">{havaleBilgi.alici}</dd>
                  <dt className="text-muted">Banka</dt>
                  <dd className="text-ink">{havaleBilgi.banka}</dd>
                  <dt className="text-muted">IBAN</dt>
                  <dd className="text-ink font-mono text-[12px] sm:text-[13px] break-all">{havaleBilgi.iban}</dd>
                </dl>
                {havaleIndirimi > 0 && havale && (
                  <p className="mt-3 text-[12px] font-body text-accent-deep">
                    Havale/EFT ile ödemede ek %{havale.oran} indirim sepetinize uygulandı.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] font-body text-ink-soft leading-relaxed">
                Ödeme sistemimizi yeniliyoruz; havale/EFT ile ödeme kısa süre içinde açılıyor.
              </p>
            )}
            <p className="mt-3 text-[12px] font-body text-muted">
              Kartla ödemek isterseniz ürünlerimiz{' '}
              <a
                href={TRENDYOL_MAGAZA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-deep underline underline-offset-2"
              >
                Trendyol mağazamızda
              </a>{' '}
              da satışta.
            </p>
          </section>

          {/* Faz 11E: misafir ödemede nazik hatırlatma — akışı KESMEZ, tek
              satır; üye girişi yapılmışsa (userId dolu) hiç basılmaz. */}
          <UyelikTesvikSatiri baglam="odeme" gizliyseGosterme={Boolean(userId)} />

          {/* Hediye Notu */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted font-body block mb-2">
              Hediye Notu (isteğe bağlı, ücretsiz)
            </label>
            <textarea
              placeholder="Sevdiklerinize özel bir not bırakın..."
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              rows={3}
              maxLength={300}
              /* text-base: iOS, 16px'ten küçük alanlara dokunulduğunda sayfayı
                 yakınlaştırıyor; masaüstünde tasarım ölçüsü korunuyor. */
              className="w-full border border-line bg-white px-4 py-3 text-base sm:text-sm font-body text-ink placeholder:text-muted focus:border-accent-line focus:outline-none transition-colors resize-none"
            />
            <p className="text-[10px] font-body text-muted mt-1 text-right">{giftNote.length}/300</p>
          </section>

          {/* Kurumsal fatura (Faz 28) — isteğe bağlı */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={kurumsalFatura}
                onChange={(e) => setKurumsalFatura(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#836835]"
              />
              <span className="font-body text-[13px] text-ink">
                Kurumsal fatura istiyorum
                <span className="mt-0.5 block text-[11px] text-muted">
                  Şirket adına fatura için vergi dairesi ve vergi numarası gerekir.
                  İşaretlemezseniz faturanız adınıza kesilir; kimlik numarası istemiyoruz.
                </span>
              </span>
            </label>

            {kurumsalFatura && (
              <div className="mt-4 space-y-3">
                <Input
                  placeholder="Firma unvanı"
                  value={fatura.firma}
                  onChange={(e) => setFatura((f) => ({ ...f, firma: e.target.value.slice(0, 150) }))}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Vergi dairesi"
                    value={fatura.vergiDairesi}
                    onChange={(e) => setFatura((f) => ({ ...f, vergiDairesi: e.target.value.slice(0, 80) }))}
                  />
                  <Input
                    placeholder="Vergi numarası"
                    inputMode="numeric"
                    value={fatura.vergiNo}
                    onChange={(e) =>
                      setFatura((f) => ({ ...f, vergiNo: e.target.value.replace(/\D/g, '').slice(0, 11) }))
                    }
                  />
                </div>
                <p className="font-body text-[11px] leading-relaxed text-muted">
                  Bu bilgiler yalnız faturanızın düzenlenmesi için saklanır.
                </p>
              </div>
            )}
          </section>

          {/* İndirim Kodu — sepetle AYNI bileşen, AYNI mesajlar (Faz 25) */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <KuponKutusu
              kod={kod}
              onKod={setKod}
              mesaj={sunucuKodHatasi}
              bilgiTonu={kuponBilgiMi}
              uygulanan={
                kuponUygulandi && secilenIndirim
                  ? { ad: kampanyaEtiketi(secilenIndirim.ad), tutar: formatPrice(secilenIndirim.tutar) }
                  : null
              }
            />
            {/* İlk sipariş kuponu hatırlatması (Faz 19). Kod zaten
                girilmişse tekrar önermeye gerek yok; sunucu da otomatik
                kampanya varken bu metni hiç göndermiyor. */}
            {ilkSiparisMetni && !kod && (
              <p className="mt-2 font-body text-[11px] text-ink-soft">
                <span className="text-accent-deep">✦</span> {ilkSiparisMetni}
              </p>
            )}
          </section>

          {paymentError && (
            <div
              role="alert"
              className="border border-red-300 bg-red-50 px-4 py-3 text-[12px] font-body text-red-700 rounded-[4px]"
            >
              {paymentError}
            </div>
          )}

          {/* Ödeme bloğu mobilde YAPIŞKAN (Faz 19).
              Ölçüm: 3632px'lik sayfada düğme yalnız dar bir bantta görünüyordu;
              klavye açıkken ulaşmak için 269px daha kaydırmak gerekiyordu ve
              "eksik alanlar" uyarısı 1787px aşağıda, ekran dışında kalıyordu.
              Blok artık ekranın altına yapışıyor: uyarı da düğme de her an
              görünür. Çerez bandı açıkken onun üstüne oturur (--nb-consent-h),
              ürün sayfasındaki StickyBuyBar ile aynı desen. */}
          <div className="fixed inset-x-0 bottom-[var(--nb-consent-h,0px)] z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-sm sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            {/* Mesafeli satış onayı — yasal zorunluluk (Faz 19).
                Etiketin tamamı tıklanabilir: 20px kutu tek başına dokunma
                hedefi olarak küçük kalırdı. */}
            <label className="mb-3 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={sozlesmeOnay}
                onChange={(e) => setSozlesmeOnay(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-ink"
              />
              <span className="font-body text-[12px] leading-relaxed text-ink-soft">
                <a
                  href={SOZLESME_YOLLARI.onBilgilendirme}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-deep underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ön bilgilendirme formunu
                </a>{' '}
                ve{' '}
                <a
                  href={SOZLESME_YOLLARI.mesafeliSatis}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-deep underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  mesafeli satış sözleşmesini
                </a>{' '}
                okudum, onaylıyorum.
              </span>
            </label>

            {/* Düğme pasifken sessiz kalmıyor: neyin eksik olduğu tek satırda
                yazılıyor (Faz 15 — BB yılı 2 haneli yazınca hiçbir uyarı yoktu). */}
            {/* Faz 11A: uyarı müşteri hiçbir şeye dokunmadan görünüyordu —
                sayfaya girer girmez "Eksik alanlar: ad, soyad, e-posta…"
                yazıyordu. İlk gönderme denemesine kadar gizli; denemeden
                sonra Faz 19 düzeni korunur (düğmeyle birlikte hep görünür,
                ekran dışına kaymaz). */}
            {denendi && !isFormValid && eksikAlanlar.length > 0 && (
              <p
                id="odeme-eksikler"
                role="alert"
                className="mb-2 text-center text-[12px] font-body text-red-600"
              >
                Eksik alanlar: {eksikAlanlar.join(', ')}
              </p>
            )}
            {/* aria-disabled KULLANILMIYOR: düğme gerçekten tıklanabilir ve
                tıklanınca eksikleri söylüyor. "Pasif" diye duyurulan ama basınca
                çalışan düğme, ekran okuyucu kullananı hiç uyarıya ulaştırmaz.
                Sönük görünüm hazır olmadığını gösterir, engel koymaz. */}
            <button
              onClick={handlePayment}
              disabled={loading || !havaleHazir}
              aria-describedby={denendi && !isFormValid ? 'odeme-eksikler' : undefined}
              className={`w-full py-4 bg-ink text-bg font-body font-medium text-[12px] tracking-[0.15em] uppercase rounded-[4px] hover:bg-accent-deep transition-colors disabled:cursor-not-allowed ${
                isFormValid ? '' : 'opacity-60'
              }`}
            >
              {loading
                ? 'İşleniyor...'
                : havaleHazir
                  ? `Siparişi onayla · ${formatPrice(total)}`
                  : 'Ödeme kısa süre içinde açılıyor'}
            </button>
            {/* Mesafeli Sözleşmeler Yön.: sipariş onayının ödeme yükümlülüğü
                doğurduğu açıkça söylenir (kartlı akışta düğme "Öde" diyordu). */}
            {havaleHazir && (
              <p className="mt-2 text-center text-[11px] font-body text-muted">
                Siparişi onayladığınızda ödeme yükümlülüğü doğar; ödemeyi havale/EFT ile yaparsınız.
              </p>
            )}
          </div>

          <div>
            {/* Güven satırı — yeni iddia yok: alıcı adı sitedeki satıcı bilgisiyle
                aynı, iade vaadi /kargo-ve-iade ile aynı. */}
            {havaleHazir && (
              <p className="mt-3 text-center text-[11px] font-body text-muted">
                Ödemeniz yalnız satıcının hesabına ({havaleBilgi?.alici}) yapılır · 14 gün içinde iade
              </p>
            )}
          </div>
        </div>

        {/* Sipariş özeti — sağ 1/3 */}
        <aside className="bg-surface border border-line rounded-[4px] p-5 sm:p-6 h-fit lg:sticky lg:top-24">
          <p className="eyebrow">Özet</p>
          <h2 className="font-heading text-[20px] font-semibold text-ink mt-1 mb-5">
            Sipariş Özeti
          </h2>
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.product.id}
                className="flex items-center gap-3 pb-4 border-b border-line last:border-0 last:pb-0"
              >
                <div className="relative w-12 h-14 bg-surface-muted shrink-0 overflow-hidden rounded-[2px]">
                  {item.product.display_images?.[0] && (
                    <Image
                      {...kucukResim(item.product.display_images[0], 256, kadrajMi(item.product.id))}
                      alt={item.product.display_title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-body text-ink leading-snug clamp-2">
                    {item.product.display_title}
                  </p>
                  <p className="text-[11px] font-body text-muted mt-0.5">
                    {item.quantity} adet
                  </p>
                </div>
                <p className="price text-[13px] text-ink shrink-0">
                  {formatPrice(
                    vitrinFiyati(
                      (item.product as any).override_price ?? item.product.display_price,
                      kampanyaIndirimi
                    ).gosterilen * item.quantity
                  )}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 pt-5 border-t border-line space-y-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12px] font-body text-ink-soft">Ara Toplam</dt>
              <dd className="price text-[13px] text-ink">{formatPrice(subtotal)}</dd>
            </div>
            {ozet.uygulananlar.map((u) => (
              <div key={u.kampanyaId} className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] font-body text-accent-deep min-w-0 truncate">{kampanyaEtiketi(u.ad)}</dt>
                <dd className="price text-[13px] text-accent-deep shrink-0">-{formatPrice(u.tutar)}</dd>
              </div>
            ))}
            {havale && havaleIndirimi > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] font-body text-accent-deep">Havale/EFT indirimi (%{havale.oran})</dt>
                <dd className="price text-[13px] text-accent-deep shrink-0">-{formatPrice(havaleIndirimi)}</dd>
              </div>
            )}
            {totalDiscount + havaleIndirimi > 0 && (
              <p className="text-[11px] font-body text-accent-deep">
                {formatPrice(totalDiscount + havaleIndirimi)} kazandınız
                {ozet.tavanUygulandi && <span className="text-muted"> · indirim tavanı uygulandı</span>}
                {kod && !kuponUygulandi && (
                  <span className="text-muted"> · en avantajlı kampanya uygulandı, indirimler toplanmaz</span>
                )}
              </p>
            )}
            {ozet.yaklasanlar.length > 0 && (
              <p className="text-[11px] font-body text-accent-deep">
                {formatPrice(ozet.yaklasanlar[0].kalanTutar)} daha ekleyin,{' '}
                {ozet.yaklasanlar[0].oran
                  ? `%${Math.round(ozet.yaklasanlar[0].oran)} kazanın`
                  : `${ozet.yaklasanlar[0].ad} kampanyasından yararlanın`}
              </p>
            )}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12px] font-body text-ink-soft">Kargo</dt>
              <dd className="price text-[13px] text-ink">
                {shipping === 0 ? SHIPPING_LINE_LABEL : formatPrice(shipping)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-line">
              <dt className="text-[12px] uppercase tracking-[0.15em] font-body text-ink">Toplam</dt>
              <dd className="price text-[18px] text-ink">{formatPrice(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
