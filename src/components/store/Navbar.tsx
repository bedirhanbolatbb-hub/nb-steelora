'use client'

import Link from 'next/link'
import { useSepetPaneli } from '@/hooks/useSepetPaneli'
import { useLinkStatus } from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Search, Heart, User, ShoppingBag, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { useWishlist } from '@/hooks/useWishlist'
import CartDrawer from './CartDrawer'
import SearchModal from './SearchModal'
import { MENU_LINKS } from '@/lib/catalog/categories'
import { FREE_SHIPPING_LABEL } from '@/lib/shipping'
import type { CouponReminder } from '@/lib/campaigns'

// Menü tek kaynaktan gelir: src/lib/catalog/categories.ts (7 kategori + Blog)
const navLinks = MENU_LINKS

/**
 * Logo tıklamasının "hiçbir şey olmadı" hissini bitiren geri bildirim (Faz 9B).
 * Anasayfa dinamik olduğu ve loading.js bulunmadığı için geçiş, sunucudan RSC
 * yanıtı gelene dek ekranda görünmez; useLinkStatus o aralıkta işareti verir.
 * Salt görsel: yalnız opacity, reduced-motion'da da güvenli.
 */
function LogoPending() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 bg-bg/45 motion-safe:transition-opacity motion-safe:duration-200',
        pending ? 'opacity-100' : 'opacity-0'
      )}
    />
  )
}

interface NavbarProps {
  bannerText?: string | null
  bannerColor?: string | null
  isLoggedIn?: boolean
  coupon?: CouponReminder | null
  /** İlk sipariş kuponu satırı — yalnız otomatik kampanya YOKKEN dolu gelir. */
  ilkSiparisSeridi?: string | null
}

/**
 * Header v2 (Faz 8B) — iki katlı klasik düzen.
 * Üst sıra: ortada büyük marka yazısı, sağda ikonlar. Alt sıra: ortalanmış
 * kategori navigasyonu. Aşağı inince iki sıra tek kompakt sıraya yoğuşur
 * (üst sıra kapanır; nav sırasının soluna küçük logo, sağına ikonlar
 * opacity/transform ile girer). Histerezis: 140px'te yoğuşur, 40px'te açılır —
 * eşik çevresinde titremez. prefers-reduced-motion'da geçişler kapalı
 * (motion-safe). Mobil tek sıra: hamburger · logo · arama+sepet.
 */
export default function Navbar({ bannerText, bannerColor, isLoggedIn, coupon, ilkSiparisSeridi }: NavbarProps) {
  const [condensed, setCondensed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Faz 11B: mobil üst bant kaydırınca tek satıra iner. Duyuru şeridinin
  // GERÇEK yüksekliği ölçülür (390px'de metin iki satıra sarıyor, sabit sayı
  // yanlış olurdu) ve başlık o kadar yukarı ÖTELENİR.
  //
  // Neden transform: sticky başlığın akıştaki kutusu aynı kalır, dolayısıyla
  // altındaki içerik ZIPLAMAZ (CLS 0). Yükseklik animasyonu ya da şeridi
  // DOM'dan çıkarmak, sayfanın tamamını yukarı çeker — ölçülen sorun buydu.
  const seritRef = useRef<HTMLDivElement>(null)
  const [seritYuksekligi, setSeritYuksekligi] = useState(0)
  // Faz 11A: sepet paneli durumu ORTAK store'a taşındı; ürün sayfası ve
  // kartlar da paneli açabilsin diye (eskiden yalnız Navbar açabiliyordu).
  const cartOpen = useSepetPaneli((s) => s.acik)
  const setCartOpen = (v: boolean) =>
    v ? useSepetPaneli.getState().ac() : useSepetPaneli.getState().kapat()
  const [searchOpen, setSearchOpen] = useState(false)
  const totalItems = useCart((s) => s.totalItems())
  const wishlistCount = useWishlist((s) => s.items.length)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        setCondensed((c) => (c ? y > 40 : y > 140))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Duyuru şeridi yüksekliği: metin uzunluğu ve ekran genişliğiyle değişir.
  useEffect(() => {
    const el = seritRef.current
    if (!el) return
    const olc = () => setSeritYuksekligi(el.getBoundingClientRect().height)
    olc()
    const go = new ResizeObserver(olc)
    go.observe(el)
    return () => go.disconnect()
  }, [])

  // Açık katman işareti — PDP'deki yapışkan çubuk ve WhatsApp düğmesi okur.
  useEffect(() => {
    const open = mobileOpen || cartOpen || searchOpen
    if (open) document.body.dataset.overlay = 'open'
    else delete document.body.dataset.overlay
    // Faz 11B: mobil menü tam ekran kaplıyor; altındaki sayfanın kaymaya
    // devam etmesi menüyü "yarı açık" gösteriyordu.
    if (mobileOpen) document.body.style.overflow = 'hidden'
    else if (!cartOpen && !searchOpen) document.body.style.overflow = ''
    return () => {
      delete document.body.dataset.overlay
    }
  }, [mobileOpen, cartOpen, searchOpen])

  const ikonlar = (
    <div className="flex items-center gap-4">
      <button className="text-ink-soft hover:text-accent-deep transition-colors" aria-label="Ara" onClick={() => setSearchOpen(true)}>
        <Search size={18} strokeWidth={1.6} />
      </button>
      <Link href="/favorilerim" className="hidden sm:block relative text-ink-soft hover:text-accent-deep transition-colors" aria-label="Favoriler">
        <Heart size={18} strokeWidth={1.6} />
        {wishlistCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-ink text-bg text-[9px] rounded-full flex items-center justify-center font-body font-medium">
            {wishlistCount}
          </span>
        )}
      </Link>
      <Link href={isLoggedIn ? '/hesabim' : '/giris'} className="hidden sm:block text-ink-soft hover:text-accent-deep transition-colors" aria-label="Hesap">
        <User size={18} strokeWidth={1.6} />
      </Link>
      <button className="relative text-ink-soft hover:text-accent-deep transition-colors" aria-label="Sepet" onClick={() => setCartOpen(true)}>
        <ShoppingBag size={18} strokeWidth={1.6} />
        {totalItems > 0 && (
          <span
            key={totalItems}
            className="animate-cart-pulse absolute -top-1.5 -right-1.5 min-w-[18px] min-h-[18px] bg-ink text-bg text-[9px] rounded-full flex items-center justify-center font-body font-medium"
          >
            {totalItems}
          </span>
        )}
      </button>
    </div>
  )

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-line bg-bg motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,0.61,0.36,1)]"
      style={
        // Yoğuşunca duyuru şeridi kadar yukarı kayar: ekranda yalnız tek satır
        // kalır, akıştaki kutu değişmediği için içerik yerinde durur.
        condensed && seritYuksekligi > 0 && !mobileOpen
          ? { transform: `translateY(-${Math.round(seritYuksekligi)}px)` }
          : undefined
      }
    >
      {/* Duyuru şeridi */}
      <div ref={seritRef} className="text-center py-2 px-4" style={{ backgroundColor: bannerColor || '#2A1E1E' }}>
        <p className="text-accent-deep text-[10px] tracking-[0.2em] uppercase font-body">
          {/* Öncelik: panelden tanımlı banner kampanyası > ilk sipariş kuponu
              duyurusu > varsayılan satır. Kupon duyurusu YALNIZ otomatik bir
              vitrin kampanyası yokken dolu gelir (bkz. ilkSiparisKuponu.ts) —
              "sepette %30" ile "kodla %10" yan yana çıkmaz. Kargo vaadi tek
              kaynaktan (lib/shipping.ts) gelmeye devam ediyor. */}
          {bannerText ||
            (ilkSiparisSeridi
              ? `${FREE_SHIPPING_LABEL} • ${ilkSiparisSeridi}`
              : `${FREE_SHIPPING_LABEL} • Premium Çelik Takılar`)}
        </p>
      </div>

      {/* ── Mobil tek sıra ── */}
      <div className="lg:hidden max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-14">
          <button className="text-ink p-1 -ml-1" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menü">
            {mobileOpen ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
          </button>
          {/* Tıklama alanı yazının kutusundan geniş: py/px ile 44px'e tamamlanır
              (negatif margin görsel yerleşimi bozmaz). */}
          <Link
            href="/"
            aria-label="Anasayfa"
            className="relative justify-self-center text-center flex flex-col justify-center min-h-[44px] px-4 -mx-4 py-1"
          >
            <span className="font-heading text-[19px] font-light tracking-[0.16em] text-ink block leading-none">
              NB STEELORA
            </span>
            <span className="text-[8px] uppercase tracking-[0.3em] text-accent-deep font-body">Fine Jewellery</span>
            <LogoPending />
          </Link>
          <div className="justify-self-end">{ikonlar}</div>
        </div>
      </div>

      {/* ── Masaüstü üst sıra: ortada büyük marka — yoğuşunca kapanır ── */}
      <div className={cn('hidden lg:block', condensed && 'lg:hidden')}>
        <div className="max-w-[1400px] mx-auto px-8 grid grid-cols-3 items-center h-[76px]">
          <div />
          <Link
            href="/"
            aria-label="Anasayfa"
            className="relative justify-self-center text-center px-6 -mx-6 py-3 -my-1 motion-safe:transition-opacity motion-safe:duration-300"
          >
            <span className="font-heading text-[27px] font-light tracking-[0.2em] text-ink block leading-none">
              NB STEELORA
            </span>
            <span className="text-[9px] uppercase tracking-[0.42em] text-accent-deep font-body mt-1 block">
              Fine Jewellery
            </span>
            <LogoPending />
          </Link>
          <div className="justify-self-end">{ikonlar}</div>
        </div>
      </div>

      {/* ── Masaüstü nav sırası — yoğuşunca kompakt tek sıra olur ── */}
      <nav
        className={cn(
          'hidden lg:block border-t border-line/60',
          condensed && 'border-t-0'
        )}
        aria-label="Kategoriler"
      >
        <div className="max-w-[1400px] mx-auto px-8 grid grid-cols-[1fr_auto_1fr] items-center h-12">
          {/* Küçük logo — yalnız kompakt hâlde görünür.
              Faz 9B: tıklama alanı yazı kutusuyla sınırlıydı (137×24) ve satırın
              tam soluna kaçtığı için ıskalanıyordu; artık dikeyde satırın tamamını
              (44px+) ve sağa doğru bir miktar boşluğu kapsıyor. */}
          <Link
            href="/"
            aria-hidden={!condensed}
            aria-label="Anasayfa"
            tabIndex={condensed ? 0 : -1}
            className={cn(
              'relative justify-self-start self-stretch flex items-center pr-8 pl-1 -ml-1',
              'font-heading text-[16px] font-light tracking-[0.16em] text-ink whitespace-nowrap',
              'motion-safe:transition-all motion-safe:duration-300',
              condensed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
            )}
          >
            NB STEELORA
            <LogoPending />
          </Link>

          <div className="flex items-center justify-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] uppercase tracking-[0.16em] font-body text-ink-soft hover:text-ink border-b border-transparent hover:border-accent-line pb-0.5 transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* İkonlar — yalnız kompakt hâlde bu sırada görünür */}
          <div
            aria-hidden={!condensed}
            className={cn(
              'justify-self-end',
              'motion-safe:transition-all motion-safe:duration-300',
              condensed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
            )}
          >
            {ikonlar}
          </div>
        </div>
      </nav>

      {/* ── Mobil menü — TAM EKRAN (Faz 11B) ──
          Eskiden başlığın altına açılan bir şeritti: altındaki sayfa görünmeye
          devam ediyor, menü yarı açık bir çekmece gibi duruyordu. Artık
          ekranın tamamını kaplıyor ve arka plan kaydırması kilitli. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
        >
          {/* Kendi başlık satırı: kapatma düğmesi hep aynı yerde */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
            <span className="font-heading text-[17px] font-light tracking-[0.16em] text-ink">
              NB STEELORA
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Menüyü kapat"
              className="-mr-2 flex h-11 w-11 items-center justify-center text-ink"
            >
              <X size={22} strokeWidth={1.6} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Kategoriler">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-[48px] items-center border-b border-line/60 font-body text-[13px] uppercase tracking-[0.16em] text-ink transition-colors hover:text-accent-deep"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-6 border-t border-line px-5 py-4">
            <Link
              href="/favorilerim"
              className="flex min-h-[44px] items-center gap-2 font-body text-[12px] text-ink-soft transition-colors hover:text-accent-deep"
              onClick={() => setMobileOpen(false)}
            >
              <Heart size={18} strokeWidth={1.6} /> Favorilerim
            </Link>
            <Link
              href={isLoggedIn ? '/hesabim' : '/giris'}
              className="flex min-h-[44px] items-center gap-2 font-body text-[12px] text-ink-soft transition-colors hover:text-accent-deep"
              onClick={() => setMobileOpen(false)}
            >
              <User size={18} strokeWidth={1.6} /> {isLoggedIn ? 'Hesabım' : 'Giriş yap'}
            </Link>
          </div>
        </div>
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} coupon={coupon} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
