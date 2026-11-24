'use client'

import Image from 'next/image'
import UyelikTesvikSatiri from '@/components/store/UyelikTesvikSatiri'
import { kampanyaEtiketi } from '@/lib/campaignLabel'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { BOS_DURUM } from '@/lib/metin/bosDurum'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Minus, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { secenekMetni } from '@/lib/catalog/secenek'
import { FREE_SHIPPING_LABEL, SHIPPING_LINE_LABEL, shippingCostFor } from '@/lib/shipping'
import { couponApplies, type CouponReminder } from '@/lib/campaigns'
import { useOtomatikIndirim } from '@/hooks/useOtomatikIndirim'
import KuponKutusu, { useKuponKodu } from '@/components/store/KuponKutusu'
import { PaylasilanSepet, SepetiPaylasDugmesi } from '@/components/store/SepetPaylasim'
import type { PaylasilanKalem } from './page'
import { kucukResim } from '@/lib/gorsel/kadraj'
import { useKadrajSorgu } from '@/components/store/KadrajContext'
import { GeriAlSatiri, useGeriAlinabilirKaldirma } from '@/components/store/SepetGeriAl'
import { GUVEN_METNI, odemeGuvenceKisa } from '@/lib/metin/guven'

// Sepet localStorage'da tutuluyor; ilk sunucu çıktısıyla uyumsuzluk olmasın diye
// içerik yalnızca hidrasyondan sonra basılır.
const subscribeNoop = () => () => {}

export default function CartPageClient({
  coupon,
  paylasilan = [],
}: {
  coupon: CouponReminder | null
  paylasilan?: PaylasilanKalem[]
}) {
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const { items, updateQuantity, totalPrice } = useCart()
  const { silinen, kaldir, geriAl } = useGeriAlinabilirKaldirma()

  const subtotal = totalPrice()
  const shipping = shippingCostFor(subtotal)
  // Kampanya indirimi ödeme adımını beklemeden burada da görünür (Faz 15).
  // Kupon artık SEPETTE de girilebiliyor (Faz 25); kod ödeme adımına taşınır.
  const [kod, setKod] = useKuponKodu()
  const kadrajMi = useKadrajSorgu()
  const kampanyaIndirimi = useVitrinIndirimi()
  const { ozet, indirim, kodHatasi, kuponBilgiMi, kuponUygulandi, ilkSiparisMetni, havale, kartAcik, yuklendi } =
    useOtomatikIndirim(
      items.map((i) => ({ productId: i.product.id, adet: Number(i.quantity) || 1 })),
      kod || null
    )
  const indirimTutari = ozet.indirimToplami
  // 12 Kas 2026: kart açıkken toplam KART tutarıdır; havale indirimi bilgi
  // satırı olur ve ödeme adımında havale seçilince düşer. Kart kapalıyken
  // tek yol havale olduğu için doğrudan düşer (7 Kas düzeni).
  const havaleTutari = havale?.tutar ?? 0
  const havaleDusulen = kartAcik ? 0 : havaleTutari
  const sepetToplami = Math.max(0, subtotal - indirimTutari - havaleDusulen) + shipping
  const hasItems = hydrated && items.length > 0


  return (
    // Denetim (Faz 11D): sepet durumu istemcide (localStorage) şekillendiği
    // için boş-durum bloğu hidrasyon SONRASI büyüyüp footer'ı itiyordu
    // (CLS 0.058). Asgari yükseklik yeri baştan tutar.
    <div className="min-h-[480px] max-w-[1400px] mx-auto px-4 lg:px-8 py-8 lg:py-16">
      <header className="mb-6 border-b border-line pb-5 lg:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-heading text-[30px] lg:text-[44px] font-medium text-ink">Sepetiniz</h1>
          {hydrated && <SepetiPaylasDugmesi />}
        </div>
      </header>

      {/* Faz 35: paylaşılan sepet bağlantısıyla gelindiyse. */}
      <PaylasilanSepet kalemler={paylasilan} />

      {/* Faz 11E: üyelere özel kampanya varsa sepette hatırlatılır. */}
      <div className="mb-6">
        <UyelikTesvikSatiri baglam="sepet" />
      </div>

      <GeriAlSatiri silinen={silinen} onGeriAl={geriAl} className="mb-5" />

      {!hydrated ? (
        <p className="text-muted font-body text-sm">Sepet yükleniyor…</p>
      ) : !hasItems ? (
        <div>
          <p className="mb-6 max-w-[52ch] font-body text-[15px] leading-relaxed text-ink-soft">
            {BOS_DURUM.sepet.baslik}. {BOS_DURUM.sepet.metin} {FREE_SHIPPING_LABEL}.
          </p>
          <Link
            prefetch={false}
            href="/urunler"
            className="inline-flex min-h-[52px] items-center rounded-[4px] bg-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-deep"
          >
            Tüm Ürünler
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
                <Link prefetch={false} href={`/urun/${product.slug}`} className="relative w-24 aspect-[4/5] rounded-[4px] bg-surface-muted shrink-0 overflow-hidden">
                  {product.display_images?.[0] && (
                    <Image
                      {...kucukResim(product.display_images[0], 256, kadrajMi(product.id))}
                      alt={product.display_title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    prefetch={false}
                    href={`/urun/${product.slug}`}
                    className="font-body text-[15px] font-medium text-ink hover:text-accent-deep transition-colors block leading-snug"
                  >
                    {product.display_title}
                  </Link>
                  {secenekMetni(product) && (
                    <p className="mt-0.5 font-body text-[13px] text-ink-soft">{secenekMetni(product)}</p>
                  )}
                  <p className="price text-[14px] text-ink mt-1.5">
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

                  {/* 24 Kas 2026: adet 26 → 44 px, kaldır 16 → 44 px; kaldırma geri alınabilir. */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-[4px] border border-line-strong">
                      <button
                        onClick={() =>
                          quantity <= 1 ? kaldir(product, quantity) : updateQuantity(product.id, quantity - 1)
                        }
                        className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-accent-deep"
                        aria-label="Azalt"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-7 text-center font-body text-[14px] tabular-nums" aria-live="polite">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-accent-deep"
                        aria-label="Artır"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <button
                      onClick={() => kaldir(product, quantity)}
                      className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink"
                      aria-label={`${product.display_title} — sepetten kaldır`}
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <p className="price shrink-0 text-[15px] text-ink">
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
              <div className="flex justify-between text-[14px] font-body text-ink-soft">
                <span>Ara toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[14px] font-body text-ink-soft">
                <span>Kargo</span>
                <span>{shipping === 0 ? SHIPPING_LINE_LABEL : formatPrice(shipping)}</span>
              </div>
              <p className="text-[12px] font-body text-ink-soft">
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
              {havale && havaleDusulen > 0 && (
                <div className="flex justify-between text-[13px] font-body text-accent-deep">
                  <span>Havale/EFT indirimi (%{havale.oran})</span>
                  <span>−{formatPrice(havaleDusulen)}</span>
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
              <div className="flex items-baseline justify-between border-t border-line pt-3 font-body text-ink">
                <span className="text-[15px] font-medium">Toplam</span>
                <span className="price text-[20px]">{formatPrice(sepetToplami)}</span>
              </div>
              {(indirim || havaleDusulen > 0) && (
                <p className="text-[12px] font-body text-ink-soft">
                  Toplam indiriminiz: {formatPrice(indirimTutari + havaleDusulen)}
                  {ozet.tavanUygulandi && (
                    <span className="text-muted"> · indirim tavanı uygulandı</span>
                  )}
                </p>
              )}
              {/* Kart açıkken havale indirimi toplamdan düşmez; müşteri
                  ödeme adımında seçebileceğini burada görür. */}
              {kartAcik && havale && havaleTutari > 0 && (
                <p className="text-[13px] font-body text-ink-soft">
                  Havale/EFT ile öderseniz ek %{havale.oran} indirimle{' '}
                  <span className="font-medium text-ink">{formatPrice(Math.max(0, sepetToplami - havaleTutari))}</span>
                </p>
              )}

              <Link
                prefetch={false}
                href="/odeme"
                className="basis mt-4 flex min-h-[52px] w-full items-center justify-center rounded-[4px] bg-ink text-center font-body text-[13px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-accent-deep"
              >
                Ödemeye Geç
              </Link>
              <Link
                prefetch={false}
                href="/urunler"
                className="flex min-h-[44px] items-center justify-center text-center font-body text-[14px] text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
              >
                Alışverişe devam et
              </Link>
              {/* 24 Kas 2026: ödemenin nasıl alındığı ödeme adımından ÖNCE de yazar
                  (lib/metin/guven; kart durumu sunucudan). Eskiden burada
                  Trendyol puanı vardı. */}
              <ul className="space-y-1.5 border-t border-line pt-3 font-body text-[12px] text-ink-soft">
                {yuklendi && (
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck size={14} strokeWidth={1.5} className="shrink-0 text-accent-deep" aria-hidden />
                    {odemeGuvenceKisa(kartAcik)}
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <RotateCcw size={14} strokeWidth={1.5} className="shrink-0 text-accent-deep" aria-hidden />
                  {GUVEN_METNI.iade} · {GUVEN_METNI.hediye}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
