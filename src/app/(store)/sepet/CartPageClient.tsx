'use client'

import Image from 'next/image'
import UyelikTesvikSatiri from '@/components/store/UyelikTesvikSatiri'
import { kampanyaEtiketi } from '@/lib/campaignLabel'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { BOS_DURUM } from '@/lib/metin/bosDurum'
import { gorselBoyutu, isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { FREE_SHIPPING_LABEL, SHIPPING_LINE_LABEL, shippingCostFor } from '@/lib/shipping'
import { couponApplies, type CouponReminder } from '@/lib/campaigns'
import { useOtomatikIndirim } from '@/hooks/useOtomatikIndirim'
import KuponKutusu, { useKuponKodu } from '@/components/store/KuponKutusu'

// Sepet localStorage'da tutuluyor; ilk sunucu çıktısıyla uyumsuzluk olmasın diye
// içerik yalnızca hidrasyondan sonra basılır.
const subscribeNoop = () => () => {}

export default function CartPageClient({ coupon }: { coupon: CouponReminder | null }) {
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  const subtotal = totalPrice()
  const shipping = shippingCostFor(subtotal)
  // Kampanya indirimi ödeme adımını beklemeden burada da görünür (Faz 15).
  // Kupon artık SEPETTE de girilebiliyor (Faz 25); kod ödeme adımına taşınır.
  const [kod, setKod] = useKuponKodu()
  const kampanyaIndirimi = useVitrinIndirimi()
  const { ozet, indirim, kodHatasi, kuponBilgiMi, kuponUygulandi, ilkSiparisMetni } = useOtomatikIndirim(
    items.map((i) => ({ productId: i.product.id, adet: Number(i.quantity) || 1 })),
    kod || null
  )
  const indirimTutari = ozet.indirimToplami
  const hasItems = hydrated && items.length > 0


  return (
    // Denetim (Faz 11D): sepet durumu istemcide (localStorage) şekillendiği
    // için boş-durum bloğu hidrasyon SONRASI büyüyüp footer'ı itiyordu
    // (CLS 0.058). Asgari yükseklik yeri baştan tutar.
    <div className="min-h-[480px] max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
      <header className="mb-10 border-b border-line pb-6">
        <p className="eyebrow">Sipariş</p>
        <h1 className="font-heading text-[38px] lg:text-[48px] font-medium text-ink mt-2">Sepetiniz</h1>
      </header>

      {/* Faz 11E: üyelere özel kampanya varsa sepette hatırlatılır. */}
      <div className="mb-6">
        <UyelikTesvikSatiri baglam="sepet" />
      </div>

      {!hydrated ? (
        <p className="text-muted font-body text-sm">Sepet yükleniyor…</p>
      ) : !hasItems ? (
        <div>
          <p className="text-muted font-body text-sm mb-6">
            {BOS_DURUM.sepet.baslik}. {BOS_DURUM.sepet.metin}
          </p>
          <Link
            href="/urunler"
            className="inline-block bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Ürünler */}
          <div className="flex-1 space-y-4">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-4 border-b border-line pb-4"
              >
                <Link href={`/urun/${product.slug}`} className="relative w-24 aspect-[4/5] rounded-[4px] bg-surface-muted shrink-0 overflow-hidden">
                  {product.display_images?.[0] && (
                    <Image
                      src={gorselBoyutu(product.display_images[0], 160)}
                      unoptimized={isRemoteMedia(product.display_images[0])}
                      alt={product.display_title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/urun/${product.slug}`}
                    className="font-heading text-[17px] font-medium text-ink hover:text-accent-deep transition-colors block leading-snug"
                  >
                    {product.display_title}
                  </Link>
                  <p className="price text-[13px] text-ink mt-1.5">
                    {(() => {
                      const f = vitrinFiyati(
                        (product as any).override_price ?? product.display_price,
                        kampanyaIndirimi
                      )
                      return (
                        <>
                          {formatPrice(f.gosterilen)}
                          {f.ustuCizili != null && (
                            <span className="ml-2 text-[12px] text-muted line-through">
                              {formatPrice(f.ustuCizili)}
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-line">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="p-1.5 text-ink-soft hover:text-accent-deep transition-colors"
                        aria-label="Azalt"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-3 text-[12px] font-body">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="p-1.5 text-ink-soft hover:text-accent-deep transition-colors"
                        aria-label="Artır"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-muted hover:text-red-500 transition-colors"
                      aria-label="Kaldır"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-[14px] font-body text-ink shrink-0">
                  {formatPrice(
                    vitrinFiyati(
                      (product as any).override_price ?? product.display_price,
                      kampanyaIndirimi
                    ).gosterilen * quantity
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Özet */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="bg-surface border border-line rounded-[4px] p-6 space-y-3 lg:sticky lg:top-28">
              <div className="flex justify-between text-[13px] font-body text-ink-soft">
                <span>Ara Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-body text-ink-soft">
                <span>Kargo</span>
                <span>{shipping === 0 ? SHIPPING_LINE_LABEL : formatPrice(shipping)}</span>
              </div>
              <p className="text-[11px] font-body text-ink">
                <span className="text-accent-deep">✓</span> {FREE_SHIPPING_LABEL}
              </p>

              {/* Kupon hatırlatması — otomatik kampanya daha avantajlıysa
                  "uygulanır" demek yanıltıcı olur: indirimler toplanmıyor. */}
              {couponApplies(coupon, subtotal) && (
                <p className="text-[11px] font-body text-ink-soft pt-1">
                  <span className="text-accent-deep">✦</span> {coupon.label}
                  <span className="text-muted">
                    {indirimTutari > 0
                      ? ' — yukarıdaki kampanya daha avantajlı, o uygulanıyor'
                      : ' — ödeme adımında uygulanır'}
                  </span>
                </p>
              )}
              <div className="border-t border-line pt-4">
                <KuponKutusu
                  kod={kod}
                  onKod={setKod}
                  mesaj={kodHatasi}
                  bilgiTonu={kuponBilgiMi}
                  uygulanan={
                    // Kuponun kazanıp kazanmadığını SUNUCU söyler; ekranda
                    // ada bakarak tahmin etmek NB30'u kupon sanmaya yol açardı.
                    kuponUygulandi && indirim
                      ? { ad: kampanyaEtiketi(indirim.ad), tutar: formatPrice(indirimTutari) }
                      : null
                  }
                />
              </div>
              {/* İlk sipariş kuponu hatırlatması (Faz 19). Sunucu yalnız
                  otomatik bir vitrin kampanyası YOKKEN dolduruyor, yani NB30
                  biter bitmez kendiliğinden görünür; ikisi hiç çakışmaz. */}
              {ilkSiparisMetni && (
                <p className="text-[11px] font-body text-ink-soft pt-1">
                  <span className="text-accent-deep">✦</span> {ilkSiparisMetni}
                </p>
              )}
              {indirim && (
                <div className="flex justify-between text-[13px] font-body text-accent-deep">
                  <span>{kampanyaEtiketi(indirim.ad)}</span>
                  <span>−{formatPrice(indirimTutari)}</span>
                </div>
              )}
              {ozet.yaklasanlar.length > 0 && (
                <p className="text-[11px] font-body text-accent-deep">
                  {formatPrice(ozet.yaklasanlar[0].kalanTutar)} daha ekleyin,{' '}
                  {ozet.yaklasanlar[0].oran
                    ? `%${Math.round(ozet.yaklasanlar[0].oran)} kazanın`
                    : `${ozet.yaklasanlar[0].ad} kampanyasından yararlanın`}
                </p>
              )}
              <div className="flex justify-between text-[15px] font-body text-ink font-medium pt-3 border-t border-line">
                <span>Toplam</span>
                <span>{formatPrice(Math.max(0, subtotal - indirimTutari) + shipping)}</span>
              </div>
              {indirim && (
                <p className="text-[11px] font-body text-accent-deep">
                  {formatPrice(indirimTutari)} kazandınız
                  {ozet.tavanUygulandi && (
                    <span className="text-muted"> · indirim tavanı uygulandı</span>
                  )}
                </p>
              )}

              <Link
                href="/odeme"
                className="mt-4 block w-full text-center py-4 bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium rounded-[4px] hover:bg-accent-deep transition-colors"
              >
                Ödemeye Geç
              </Link>
              <Link
                href="/urunler"
                className="block text-center text-[11px] font-body text-muted hover:text-accent-deep transition-colors"
              >
                Alışverişe devam et
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
