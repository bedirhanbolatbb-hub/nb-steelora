'use client'

import { useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { kampanyaEtiketi } from '@/lib/campaignLabel'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { markaKategorisi } from '@/lib/catalog/categories'
import { secenekMetni } from '@/lib/catalog/secenek'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { BOS_DURUM } from '@/lib/metin/bosDurum'
import { kaydirmaKilidi } from '@/lib/ui/kaydirmaKilidi'
import { useKatmanKlavyesi } from '@/hooks/useKatmanKlavyesi'
import Link from 'next/link'
import { X, Minus, Plus, Trash2, ShoppingBag, ShieldCheck, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import Button from '@/components/ui/Button'
import { FREE_SHIPPING_LABEL, tahminiTeslimEtiketi } from '@/lib/shipping'
import { GUVEN_METNI, odemeGuvenceKisa } from '@/lib/metin/guven'
import { GeriAlSatiri, useGeriAlinabilirKaldirma } from '@/components/store/SepetGeriAl'
import { couponApplies, type CouponReminder } from '@/lib/campaigns'
import { useOtomatikIndirim } from '@/hooks/useOtomatikIndirim'
import { SepetiPaylasDugmesi } from '@/components/store/SepetPaylasim'
import { indirimNotu } from '@/lib/sepet/indirimNotu'
import { kucukResim } from '@/lib/gorsel/kadraj'
import { useKadrajSorgu } from '@/components/store/KadrajContext'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  coupon?: CouponReminder | null
}

export default function CartDrawer({ isOpen, onClose, coupon }: CartDrawerProps) {
  // Faz 11B: panel açıkken arka sayfa kayıyordu (kilit hiç konmamıştı).
  useEffect(() => kaydirmaKilidi(isOpen), [isOpen])
  // Denetim: Escape kapatmıyordu; kapalıyken ekran DIŞINDAKİ düğmeler Tab
  // sırasındaydı (odak görünmez ögelere gidiyordu) — inert ile çözülüyor.
  const kapRef = useRef<HTMLDivElement>(null)
  useKatmanKlavyesi(isOpen, onClose, kapRef)
  const { items, updateQuantity, totalPrice } = useCart()
  // 24 Kas 2026: kaldırma geri alınabilir (components/store/SepetGeriAl).
  const { silinen, kaldir, geriAl } = useGeriAlinabilirKaldirma()
  // Faz 11A: fiyat gösterimi vitrin kampanyasından türer (tek kaynak).
  const kadrajMi = useKadrajSorgu()
  const kampanyaIndirimi = useVitrinIndirimi()
  const subtotal = totalPrice()
  // İndirim artık ödeme adımını beklemeden burada görünüyor (Faz 15).
  const { ozet, indirim, havale, kartAcik, yuklendi } = useOtomatikIndirim(
    items.map((i) => ({ productId: i.product.id, adet: Number(i.quantity) || 1 }))
  )
  // Ek havale/EFT indirimi (7 Kas 2026) — sunucudan; ürün kartında yok,
  // yalnız sepette ve ödeme adımında görünür (BB kararı).
  // 12 Kas 2026: kart açıkken toplam KART tutarıdır; havale indirimi yalnız
  // bilgi satırı olur ve ödeme adımında havale seçilince düşer. Kart
  // kapalıyken tek yol havale olduğu için indirim doğrudan düşer.
  const havaleTutari = havale?.tutar ?? 0
  const havaleDusulen = kartAcik ? 0 : havaleTutari
  const indirimVar = Boolean(indirim) || havaleDusulen > 0
  const indirimliToplam = Math.max(0, subtotal - ozet.indirimToplami - havaleDusulen)
  // Tek indirim satırında toplam yinelenmez (lib/sepet/indirimNotu).
  const indirimNotuMetni = indirimNotu(
    {
      satirSayisi: ozet.uygulananlar.length + (havaleDusulen > 0 ? 1 : 0),
      toplam: ozet.indirimToplami + havaleDusulen,
      tavanUygulandi: ozet.tavanUygulandi,
    },
    formatPrice
  )
  const hasItems = items.length > 0
  // Faz 36: teslim süresi tarih olarak (panel her açıldığında yeniden hesap).
  const teslimEtiketi = useMemo(() => (isOpen ? tahminiTeslimEtiketi() : ''), [isOpen])


  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-ink/50 z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={kapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sepetiniz"
        inert={!isOpen}
        aria-hidden={!isOpen}
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-bg z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="font-heading text-[20px] font-medium text-ink">
            Sepetiniz ({items.length})
          </h2>
          <button
            onClick={onClose}
            className="-mr-3 flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
            aria-label="Kapat"
          >
            <X size={22} strokeWidth={1.6} />
          </button>
        </div>
        <GeriAlSatiri silinen={silinen} onGeriAl={geriAl} className="mx-6 mt-3" />

        {hasItems ? (
          <>
            {/* Ürünler */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => {
                const imageUrl =
                  item.product.display_images?.[0] || '/placeholder-product.jpg'
                return (
                  <div
                    key={item.product.id}
                    className="flex gap-4 pb-4 border-b border-line/50"
                  >
                    {/* Faz 35: görsel ve ad ürün sayfasına gider (BB: "sepetteki
                        ürüne tıklayınca ürünün içine girmiyor"). */}
                    <Link
                      prefetch={false}
                      href={`/urun/${item.product.slug}`}
                      onClick={onClose}
                      className="relative w-20 h-24 bg-surface-muted shrink-0 block"
                      aria-label={item.product.display_title}
                    >
                      <Image
                        {...kucukResim(imageUrl, 256, kadrajMi(item.product.id))}
                        alt={item.product.display_title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body text-[14px] font-medium leading-snug text-ink line-clamp-2">
                        <Link
                          prefetch={false}
                          href={`/urun/${item.product.slug}`}
                          onClick={onClose}
                          className="hover:text-accent-deep transition-colors"
                        >
                          {item.product.display_title}
                        </Link>
                      </h3>
                      <p className="text-[12px] text-muted font-body mt-0.5">
                        {[markaKategorisi(item.product.trendyol_category), secenekMetni(item.product)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {/* Faz 11A: satır liste fiyatını gösteriyordu; ürün
                          sayfasında indirimli, burada tam fiyat çıkıyordu. */}
                      <p className="text-[14px] font-body mt-1">
                        {(() => {
                          const f = vitrinFiyati(
                            (item.product as any).override_price ?? item.product.display_price,
                            kampanyaIndirimi
                          )
                          return (
                            <>
                              <span className="font-semibold text-ink">
                                {formatPrice(f.gosterilen)}
                              </span>
                              {f.ustuCizili != null && (
                                <span className="text-muted line-through ml-2 text-[12px]">
                                  {formatPrice(f.ustuCizili)}
                                </span>
                              )}
                            </>
                          )
                        })()}
                      </p>
                      {/* 24 Kas 2026: adet düğmeleri 28 → 44 px, kaldır 14 → 44 px;
                          son adette eksi de geri alınabilir kaldırmadır. */}
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex items-center rounded-[4px] border border-line-strong">
                          <button
                            onClick={() =>
                              item.quantity <= 1
                                ? kaldir(item.product, item.quantity)
                                : updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-accent-deep"
                            aria-label="Azalt"
                          >
                            <Minus size={15} />
                          </button>
                          <span className="w-7 text-center font-body text-[14px] tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-accent-deep"
                            aria-label="Artır"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                        <button
                          onClick={() => kaldir(item.product, item.quantity)}
                          className="-mr-3 flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink"
                          aria-label={`${item.product.display_title} — sepetten kaldır`}
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="pt-1">
                <SepetiPaylasDugmesi />
              </div>
            </div>

            {/* Ücretsiz kargo güven rozeti — kargo koşulsuz ücretsiz olduğu için
                ilerleme çubuğu kaldırıldı (tek satır kaldı).
                Faz 36: yanına teslim TARİHİ eklendi. Ölçülen kusur: 30 günde
                26 sepete eklemeden yalnız 1'i ödeme adımına geçti; ödeme
                kararının verildiği bu panelde "ne zaman gelir" sorusunun
                cevabı yoktu (yalnız /kargo-ve-iade sayfasında yazıyordu). */}
            <div className="px-6 py-3 bg-surface-muted/50">
              <p className="text-[13px] font-body text-ink text-center">
                <span className="text-accent-deep">✓</span> {FREE_SHIPPING_LABEL}
                {teslimEtiketi && (
                  <span className="text-ink-soft"> · Tahmini teslim {teslimEtiketi}</span>
                )}
              </p>
            </div>

            {/* Kupon hatırlatması — yalnız kampanya bu sepete uygulanabiliyorsa */}
            {couponApplies(coupon ?? null, subtotal) && (
              <div className="px-6 py-2.5 border-t border-line">
                <p className="text-[12px] font-body text-ink-soft">
                  <span className="text-accent-deep">✦</span> {coupon!.label}
                  <span className="text-muted">
                    {indirim
                      ? ' — kampanya daha avantajlı, o uygulanıyor'
                      : ' — ödeme adımında uygulanır'}
                  </span>
                </p>
              </div>
            )}

            {/* Alt kısım */}
            <div className="px-6 py-5 border-t border-line">
              <div className="mb-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-body text-ink-soft">
                    {indirimVar ? 'Ara toplam' : 'Toplam'}
                  </span>
                  <span
                    className={`font-body ${indirimVar ? 'text-[14px] text-muted line-through' : 'text-[18px] font-semibold text-ink'}`}
                  >
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {indirimVar && (
                  <>
                    {indirim && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-body text-ink-soft">{kampanyaEtiketi(indirim.ad)}</span>
                        <span className="text-[14px] font-body text-accent-deep">
                          −{formatPrice(indirim.tutar)}
                        </span>
                      </div>
                    )}
                    {havale && havaleDusulen > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-body text-ink-soft">Havale/EFT indirimi (%{havale.oran})</span>
                        <span className="text-[14px] font-body text-accent-deep">−{formatPrice(havaleDusulen)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-line pt-2">
                      <span className="text-[14px] font-body font-medium text-ink">Toplam</span>
                      <span className="text-[18px] font-body font-semibold text-ink">
                        {formatPrice(indirimliToplam)}
                      </span>
                    </div>
                    {indirimNotuMetni && (
                      <p className="text-[12px] font-body text-ink-soft">{indirimNotuMetni}</p>
                    )}
                  </>
                )}
                {/* Kart açıkken havale indirimi toplamdan düşmez; müşteri
                    ödeme adımında seçebileceğini burada görür. */}
                {kartAcik && havale && havaleTutari > 0 && (
                  <p className="text-[13px] font-body text-ink-soft">
                    Havale/EFT ile öderseniz ek %{havale.oran} indirimle{' '}
                    <span className="font-medium text-ink">
                      {formatPrice(Math.max(0, indirimliToplam - havaleTutari))}
                    </span>
                  </p>
                )}
              </div>
              <Link
                prefetch={false}
                href="/odeme"
                onClick={onClose}
                className="basis flex min-h-[52px] w-full items-center justify-center rounded-[4px] bg-ink text-center font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep"
              >
                Ödemeye Geç
              </Link>
              <button
                onClick={onClose}
                className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-[4px] border border-line-strong text-center font-body text-[14px] font-medium text-ink transition-colors hover:border-ink"
              >
                Alışverişe devam et
              </button>
              {/* 24 Kas 2026 tasarım denetimi: burada Trendyol puanı ve 10 px'lik
                  üç parça vardı; müşterinin bu noktadaki sorusu "nasıl
                  ödeyeceğim, güvenli mi?" idi ve yanıtı yoktu. Puan ana sayfa,
                  ürün sayfası ve ödeme adımında duruyor. Metinler tek
                  kaynaktan (lib/metin/guven); kart durumu sunucudan. */}
              <ul className="mt-4 space-y-1.5 font-body text-[12px] text-ink-soft">
                {yuklendi && (
                  <li className="flex items-center justify-center gap-1.5 text-center">
                    <ShieldCheck size={14} strokeWidth={1.5} className="shrink-0 text-accent-deep" aria-hidden />
                    {odemeGuvenceKisa(kartAcik)}
                  </li>
                )}
                <li className="flex items-center justify-center gap-1.5 text-center">
                  <RotateCcw size={14} strokeWidth={1.5} className="shrink-0 text-accent-deep" aria-hidden />
                  {GUVEN_METNI.iade} · {GUVEN_METNI.hediye}
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <ShoppingBag size={48} className="text-line mb-4" />
            <p className="text-[14px] font-body text-ink-soft">{BOS_DURUM.sepet.baslik}</p>
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Alışverişe Başla
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
