'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import Input from '@/components/ui/Input'

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
  const totalDiscount = autoDiscountTotal + codeDiscountAmount
  const shipping = autoFreeShipping || subtotal >= 500 ? 0 : 49.9
  const total = subtotal - totalDiscount + shipping

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

  const handlePayment = async () => {
    if (!isFormValid) return
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
        alert('Ödeme başlatılamadı: ' + data.error)
      }
    } catch {
      alert('Bir hata oluştu, lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }


  // Boş sepet
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 text-center">
        <h1 className="font-heading text-[32px] text-text-primary mb-4">
          Sepetiniz Boş
        </h1>
        <p className="text-text-muted font-body text-sm mb-6">
          Ödeme yapabilmek için sepetinize ürün ekleyin.
        </p>
        <a
          href="/urunler"
          className="inline-block border border-gold text-gold text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:bg-gold hover:text-white transition-all"
        >
          Ürünlere Git
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
      <h1 className="font-heading text-[32px] font-light text-text-primary mb-10">
        Ödeme
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Form — sol 2/3 */}
        <div className="lg:col-span-2">
          {/* Üyelik uyarısı — sadece giriş yapılmamış kullanıcılara */}
          {!userId && (
            <div className="bg-champagne border border-gold/40 border-l-4 border-l-gold p-4 mb-6 rounded-sm">
              <p className="text-[14px] font-body font-medium text-text-primary mb-1">
                Üye olarak sipariş verin, daha fazlasını kazanın
              </p>
              <p className="text-[13px] font-body text-text-secondary mb-3">
                Kargo takibi, sipariş geçmişi ve özel kampanyalar için üye olun.
              </p>
              <div className="flex items-center gap-3 text-[13px] font-body">
                <a href="/giris" className="text-gold hover:text-gold-light underline transition-colors">
                  Giriş yap
                </a>
                <a href="/kayit" className="text-gold hover:text-gold-light underline transition-colors">
                  Üye ol
                </a>
                <span className="text-text-muted">veya misafir olarak devam edin ↓</span>
              </div>
            </div>
          )}

          <h2 className="text-[11px] uppercase tracking-[0.2em] font-body text-gold mb-6">
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

          {/* Kart Bilgileri */}
          <div className="mt-8">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-body text-gold mb-6">
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
          </div>

          {/* Hediye Notu */}
          <div className="mt-4">
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-2">
              Hediye Notu (isteğe bağlı)
            </label>
            <textarea
              placeholder="Sevdiklerinize özel bir not bırakın..."
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full border border-champagne-mid bg-white px-4 py-3 text-sm font-body text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors resize-none"
            />
            <p className="text-[10px] font-body text-text-muted mt-1 text-right">{giftNote.length}/300</p>
          </div>

          {/* İndirim Kodu */}
          <div className="mt-6 pt-6 border-t border-champagne-mid">
            <p className="text-[11px] uppercase tracking-[0.2em] font-body text-text-muted mb-3">
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
                  className="px-4 py-2 border border-red-300 text-red-500 text-[11px] uppercase tracking-wider hover:bg-red-50 transition-colors"
                >
                  Kaldır
                </button>
              ) : (
                <button
                  onClick={applyDiscount}
                  disabled={discountLoading || !discountCode.trim()}
                  className="px-4 py-2 border border-gold text-gold text-[11px] uppercase tracking-wider hover:bg-gold hover:text-white transition-colors disabled:opacity-50"
                >
                  {discountLoading ? '...' : 'Uygula'}
                </button>
              )}
            </div>
            {discountError && (
              <p className="text-[11px] text-red-500 font-body mt-2">{discountError}</p>
            )}
            {appliedDiscount && (
              <p className="text-[11px] text-green-700 font-body mt-2">
                ✓ {appliedDiscount.description} — {formatPrice(appliedDiscount.amount)} indirim
              </p>
            )}
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || !isFormValid}
            className="mt-6 w-full py-4 bg-gold text-white font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'İşleniyor...' : `${formatPrice(total)} Öde`}
          </button>

          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-body text-text-muted">
            <span>🔒 SSL Korumalı</span>
            <span>•</span>
            <span>3D Secure</span>
            <span>•</span>
            <span>iyzico Güvencesi</span>
          </div>

          {/* iyzico Güven Rozetleri */}
          <div className="mt-6 pt-6 border-t border-champagne-mid">
            <p className="text-[10px] text-text-muted text-center mb-4 uppercase tracking-[0.2em] font-body">
              Güvenli Ödeme
            </p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <img
                src="/badges/iyzico-logo-pack/iyzico-logo-pack/checkout_iyzico_ile_ode/TR/Tr_Colored/iyzico_ile_ode_colored.svg"
                alt="iyzico ile öde"
                className="h-10 object-contain"
              />
              <div className="flex items-center gap-1 text-[11px] text-text-muted border border-text-muted/30 px-2 py-1 rounded">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>256-bit SSL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sipariş özeti — sağ 1/3 */}
        <div className="bg-champagne-dark/50 p-6 h-fit">
          <h2 className="font-heading text-[18px] text-text-primary mb-6">
            Sipariş Özeti
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 pb-3 border-b border-champagne-mid/30"
              >
                <div className="relative w-12 h-14 bg-champagne-dark shrink-0">
                  {item.product.display_images?.[0] && (
                    <Image
                      src={item.product.display_images[0]}
                      alt={item.product.display_title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-body text-text-primary truncate">
                    {item.product.display_title}
                  </p>
                  <p className="text-[10px] font-body text-text-muted">
                    Adet: {item.quantity}
                  </p>
                </div>
                <p className="text-[12px] font-body text-text-primary shrink-0">
                  {formatPrice(item.product.display_price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-champagne-mid/50 space-y-2">
            <div className="flex justify-between text-[12px] font-body text-text-secondary">
              <span>Ara Toplam</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {autoDiscounts.map((d) => (
              <div key={d.id} className="flex justify-between text-[12px] font-body text-green-700">
                <span>🎉 {d.name}</span>
                <span>-{formatPrice(d.amount)}</span>
              </div>
            ))}
            {appliedDiscount && (
              <div className="flex justify-between text-[12px] font-body text-green-700">
                <span>İndirim ({appliedDiscount.code})</span>
                <span>-{formatPrice(appliedDiscount.amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[12px] font-body text-text-secondary">
              <span>Kargo</span>
              <span>
                {shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}
              </span>
            </div>
            <div className="flex justify-between text-[14px] font-body text-gold font-medium pt-2 border-t border-champagne-mid/50">
              <span>Toplam</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
