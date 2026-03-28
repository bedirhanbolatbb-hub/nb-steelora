'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import Input from '@/components/ui/Input'

export default function OdemePage() {
  const { items, totalPrice, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [iframeHtml, setIframeHtml] = useState<string | null>(null)

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

  const subtotal = totalPrice()
  const shipping = subtotal >= 500 ? 0 : 49.9
  const total = subtotal + shipping

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const isFormValid =
    form.firstName &&
    form.lastName &&
    form.email &&
    form.phone &&
    form.city &&
    form.district &&
    form.address

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
        }),
      })

      const data = await res.json()
      if (data.success) {
        setIframeHtml(data.htmlContent)
      } else {
        alert('Ödeme başlatılamadı: ' + data.error)
      }
    } catch {
      alert('Bir hata oluştu, lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // 3DS iframe
  if (iframeHtml) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <iframe
          srcDoc={iframeHtml}
          className="w-full max-w-lg h-[600px] border-0"
          title="3D Secure Ödeme"
        />
      </div>
    )
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

          <button
            onClick={handlePayment}
            disabled={loading || !isFormValid}
            className="mt-8 w-full py-4 bg-gold text-white font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
