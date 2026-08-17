'use client'

import { useState, useEffect, useRef } from 'react'
import { isRemoteMedia } from '@/lib/images'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import Input from '@/components/ui/Input'
import CheckoutSteps from '@/components/store/CheckoutSteps'
import { izle } from '@/lib/analytics/izle'

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
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; description: string } | null>(null)
  const [discountError, setDiscountError] = useState('')
  const [discountLoading, setDiscountLoading] = useState(false)
  const [autoDiscounts, setAutoDiscounts] = useState<{ id: string; name: string; type: string; amount: number }[]>([])
  const [autoFreeShipping, setAutoFreeShipping] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    district: '',
    address: '',
    zipCode: '',
    cardHolderName: '',
    cardNumber: '',
    expireMonth: '',
    expireYear: '',
    cvc: '',
  })
  const [giftNote, setGiftNote] = useState('')

  const subtotal = totalPrice()

  // Auto-apply campaigns
  useEffect(() => {
    if (items.length === 0) { setAutoDiscounts([]); setAutoFreeShipping(false); return }
    const itemPrices = items.map((i) => i.product.display_price)
    fetch('/api/discount/auto-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartTotal: subtotal, itemCount: items.length, itemPrices }),
    })
      .then((r) => r.json())
      .then((data) => {
        setAutoDiscounts(data.discounts || [])
        setAutoFreeShipping(data.freeShipping || false)
      })
      .catch(() => {})
  }, [subtotal, items.length])

  const autoDiscountTotal = autoDiscounts.reduce((sum, d) => sum + d.amount, 0)
  const codeDiscountAmount = appliedDiscount?.amount || 0
  const totalDiscount = Math.min(autoDiscountTotal + codeDiscountAmount, subtotal)
  // Kargo eşiği indirimli ara toplam üzerinden — sunucudaki hesapla birebir
  // aynı olmalı, yoksa ekrandaki toplam ile çekilen tutar ayrışır (Faz 11).
  const discountedSubtotal = subtotal - totalDiscount
  const shipping = autoFreeShipping || discountedSubtotal >= 500 ? 0 : 49.9
  const total = discountedSubtotal + shipping

  const applyDiscount = async () => {
    if (!discountCode.trim()) return
    setDiscountLoading(true)
    setDiscountError('')
    try {
      const res = await fetch('/api/discount/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, cartTotal: subtotal }),
      })
      const data = await res.json()
      if (data.discount) {
        setAppliedDiscount(data.discount)
        setDiscountError('')
      } else {
        setDiscountError(data.error || 'Geçersiz kod')
        setAppliedDiscount(null)
      }
    } catch {
      setDiscountError('Bir hata oluştu')
    }
    setDiscountLoading(false)
  }

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  // Format card number display: 4-digit groups
  const formatCardDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 16)
    updateField('cardNumber', formatCardDisplay(digits))
  }

  const handleExpireMonthChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 2)
    updateField('expireMonth', digits)
  }

  const handleExpireYearChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 4)
    updateField('expireYear', digits)
  }

  const handleCvcChange = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 4)
    updateField('cvc', digits)
  }

  const rawCardNumber = form.cardNumber.replace(/\s/g, '')

  const isFormValid =
    form.firstName &&
    form.lastName &&
    form.email &&
    form.phone &&
    form.city &&
    form.district &&
    form.address &&
    form.cardHolderName &&
    rawCardNumber.length === 16 &&
    form.expireMonth.length >= 1 &&
    form.expireYear.length === 4 &&
    form.cvc.length >= 3

  // Ödemeye başlama ölçümü — form gönderilmeden önce bir kez (Faz 12).
  const olcumYapildi = useRef(false)
  useEffect(() => {
    if (olcumYapildi.current || items.length === 0) return
    olcumYapildi.current = true
    izle('begin_checkout', { value: subtotal, meta: { kalem: items.length } })
  }, [items.length, subtotal])

  const handlePayment = async () => {
    if (!isFormValid) return
    setPaymentError('')
    setLoading(true)
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            name: i.product.display_title,
            price: i.product.display_price,
            quantity: i.quantity,
            category: i.product.trendyol_category,
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
          paymentCard: {
            cardHolderName: form.cardHolderName,
            cardNumber: rawCardNumber,
            expireMonth: form.expireMonth.padStart(2, '0'),
            expireYear: form.expireYear,
            cvc: form.cvc,
            registerCard: '0',
          },
          userId,
          giftNote: giftNote || null,
          // Faz 11: kod sunucuya gönderilir ve orada YENİDEN doğrulanır;
          // tutar istemciden taşınmaz.
          discountCode: appliedDiscount?.code || null,
        }),
      })

      const data = await res.json()
      if (data.success && data.htmlContent) {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = '/api/3ds-redirect'
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'htmlContent'
        input.value = data.htmlContent
        form.appendChild(input)
        document.body.appendChild(form)
        form.submit()
      } else {
        setPaymentError(data.error ? `Ödeme başlatılamadı: ${data.error}` : 'Ödeme başlatılamadı.')
      }
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
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
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
            <div className="bg-accent-soft/60 border border-accent/30 p-5 rounded-[4px]">
              <p className="text-[13px] font-body font-medium text-ink mb-1">
                Üye olarak sipariş verin, daha fazlasını kazanın
              </p>
              <p className="text-[12px] font-body text-ink-soft mb-3">
                Kargo takibi, sipariş geçmişi ve özel kampanyalar için üye olun.
              </p>
              <div className="flex items-center gap-4 text-[12px] font-body">
                <a href="/giris" className="text-accent-deep underline underline-offset-4 hover:text-accent transition-colors">
                  Giriş yap
                </a>
                <a href="/kayit" className="text-accent-deep underline underline-offset-4 hover:text-accent transition-colors">
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
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
            <Input
              placeholder="Soyad *"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
            <Input
              placeholder="E-posta *"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <Input
              placeholder="Telefon *"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <Input
              placeholder="İl *"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
            <Input
              placeholder="İlçe *"
              value={form.district}
              onChange={(e) => updateField('district', e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                placeholder="Açık Adres *"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
            <Input
              placeholder="Posta Kodu"
              value={form.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
            />
          </div>
          </section>

          {/* Kart Bilgileri */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <p className="eyebrow">Adım 2</p>
            <h2 className="font-heading text-[20px] font-semibold text-ink mt-1 mb-5">
              Kart Bilgileri
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Kart Üzerindeki İsim *"
                  value={form.cardHolderName}
                  onChange={(e) => updateField('cardHolderName', e.target.value.toUpperCase())}
                  autoComplete="cc-name"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Kart Numarası *"
                  value={form.cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  autoComplete="cc-number"
                  inputMode="numeric"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-1">
                <Input
                  placeholder="Ay (MM) *"
                  value={form.expireMonth}
                  onChange={(e) => handleExpireMonthChange(e.target.value)}
                  autoComplete="cc-exp-month"
                  inputMode="numeric"
                  maxLength={2}
                />
                <Input
                  placeholder="Yıl (YYYY) *"
                  value={form.expireYear}
                  onChange={(e) => handleExpireYearChange(e.target.value)}
                  autoComplete="cc-exp-year"
                  inputMode="numeric"
                  maxLength={4}
                />
              </div>
              <Input
                placeholder="CVV *"
                value={form.cvc}
                onChange={(e) => handleCvcChange(e.target.value)}
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={4}
                type="password"
              />
            </div>
          </section>

          {/* Hediye Notu */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted font-body block mb-2">
              Hediye Notu (isteğe bağlı)
            </label>
            <textarea
              placeholder="Sevdiklerinize özel bir not bırakın..."
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full border border-line bg-white px-4 py-3 text-sm font-body text-ink placeholder:text-muted focus:border-accent focus:outline-none transition-colors resize-none"
            />
            <p className="text-[10px] font-body text-muted mt-1 text-right">{giftNote.length}/300</p>
          </section>

          {/* İndirim Kodu */}
          <section className="bg-surface border border-line rounded-[4px] p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.15em] font-body text-muted mb-3">
              İndirim Kodu
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Kodu girin"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1"
                disabled={!!appliedDiscount}
              />
              {appliedDiscount ? (
                <button
                  onClick={() => { setAppliedDiscount(null); setDiscountCode('') }}
                  className="shrink-0 px-4 py-2 border border-line text-ink-soft text-[11px] uppercase tracking-[0.15em] font-body hover:border-ink hover:text-ink transition-colors rounded-[4px]"
                >
                  Kaldır
                </button>
              ) : (
                <button
                  onClick={applyDiscount}
                  disabled={discountLoading || !discountCode.trim()}
                  className="shrink-0 px-4 py-2 border border-ink text-ink text-[11px] uppercase tracking-[0.15em] font-body hover:bg-ink hover:text-bg transition-colors disabled:opacity-40 rounded-[4px]"
                >
                  {discountLoading ? '...' : 'Uygula'}
                </button>
              )}
            </div>
            {discountError && (
              <p className="text-[11px] text-red-600 font-body mt-2">{discountError}</p>
            )}
            {appliedDiscount && (
              <p className="text-[11px] text-green-700 font-body mt-2">
                ✓ {appliedDiscount.description} — {formatPrice(appliedDiscount.amount)} indirim
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

          <div>
            <button
              onClick={handlePayment}
              disabled={loading || !isFormValid}
              className="w-full py-4 bg-ink text-bg font-body font-medium text-[12px] tracking-[0.15em] uppercase rounded-[4px] hover:bg-accent-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'İşleniyor...' : `${formatPrice(total)} Öde`}
            </button>

            {/* Güven satırı — tek satır, yeni iddia yok; logolar footer'daki set */}
            <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-[11px] font-body text-muted whitespace-nowrap">
                iyzico ile güvenli ödeme
              </span>
              <img
                src="/badges/iyzico-logo-pack/iyzico-logo-pack/footer_iyzico_ile_ode/Colored/logo_band_colored.svg"
                alt="iyzico, Visa, Mastercard, Troy"
                className="h-4 sm:h-5 object-contain shrink"
              />
            </div>
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
                      src={item.product.display_images[0]}
                      unoptimized={isRemoteMedia(item.product.display_images[0])}
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
                  {formatPrice(item.product.display_price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 pt-5 border-t border-line space-y-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12px] font-body text-ink-soft">Ara Toplam</dt>
              <dd className="price text-[13px] text-ink">{formatPrice(subtotal)}</dd>
            </div>
            {autoDiscounts.map((d) => (
              <div key={d.id} className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] font-body text-green-700 min-w-0 truncate">{d.name}</dt>
                <dd className="price text-[13px] text-green-700 shrink-0">-{formatPrice(d.amount)}</dd>
              </div>
            ))}
            {appliedDiscount && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] font-body text-green-700 min-w-0 truncate">
                  İndirim ({appliedDiscount.code})
                </dt>
                <dd className="price text-[13px] text-green-700 shrink-0">
                  -{formatPrice(appliedDiscount.amount)}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12px] font-body text-ink-soft">Kargo</dt>
              <dd className="price text-[13px] text-ink">
                {shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}
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
