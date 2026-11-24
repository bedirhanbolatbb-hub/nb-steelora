'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { useCart } from '@/hooks/useCart'
import { useSepetPaneli } from '@/hooks/useSepetPaneli'
import { formatPrice } from '@/lib/utils'
import { FREE_SHIPPING_SHORT } from '@/lib/shipping'
import { GUVEN_METNI } from '@/lib/metin/guven'
import type { Product } from '@/types'

/** Satın alma bloğunun ve beden bölümünün çıpaları — PDP'de basılır. */
export const BUY_BLOCK_ID = 'buy-block'
export const SIZE_BLOCK_ID = 'beden-secimi'

const ADDED_FEEDBACK_MS = 1600

/**
 * Yalnız dar ekranda (sm altı) görünen yapışkan satın alma çubuğu.
 *
 * Görünürlük kuralları:
 * - Asıl "Sepete Ekle" düğmesi ekranda DEĞİLKEN görünür — düğme ister henüz
 *   aşağıda olsun (sayfa açılışı), ister yukarıda kalmış olsun.
 *   24 Kas 2026 tasarım denetimi: eskiden çubuk yalnız düğme yukarıda
 *   kaldığında çıkıyordu; telefonda fiyat ve düğme ilk ekranın altındaydı
 *   (y≈830–960), yani sayfa açıldığında ekranda ne fiyat ne satın alma yolu
 *   vardı. Son 7 günde 60 ürün görüntülemesinden 1 sepete ekleme çıktı.
 * - Sepet çekmecesi / menü / arama açıkken CSS ile gizlenir
 *   (body[data-overlay='open'] — bkz. globals.css, Navbar).
 * - Klavye açıkken gizlenir: visualViewport yüksekliği belirgin düşerse ya da
 *   odak bir form alanındaysa (PDP'de yorum formu var).
 * - prefers-reduced-motion: geçiş yok, doğrudan görünür (globals.css).
 */
export default function StickyBuyBar({
  product,
  title,
  price,
  outOfStock,
  hasSizes,
}: {
  product: Product
  title: string
  price: number
  outOfStock: boolean
  hasSizes: boolean
}) {
  const kampanyaIndirimi = useVitrinIndirimi()
  const panelAc = useSepetPaneli((s) => s.ac)
  const fiyat = vitrinFiyati(price, kampanyaIndirimi)
  const addItem = useCart((s) => s.addItem)
  const [dugmeGorunmuyor, setDugmeGorunmuyor] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [added, setAdded] = useState(false)
  // Beden seçimi bir kez teyit edildiyse çubuk doğrudan sepete ekler.
  const sizeConfirmed = useRef(false)

  /**
   * Çubuk, asıl düğmenin ORTASI ekranın görünür bandının dışındayken belirir
   * (üstte yapışkan başlık 56 px; altta 8 px pay). Düğmenin yarısı göründüğü
   * an çubuk çekilir — aynı anda iki "Sepete Ekle" durmaz.
   *
   * Ölçüm kaydırma anında yapılır, IntersectionObserver ile DEĞİL: IO yalnız
   * kesişim durumu DEĞİŞTİĞİNDE haber verir. Blok açılışta katlama altındaysa
   * (500x800'lük bir pencerede tam olarak böyle) ve kullanıcı hızlı kaydırıp
   * bloğu hiçbir karede ekranda göstermeden geçerse, IO bir daha hiç
   * tetiklenmiyor ve çubuk kalıcı olarak gizli kalıyordu.
   *
   * Klavye durumu da burada ölçülür: tek seferlik bir okuma yanlış çıkarsa
   * (ör. açılış anında görsel viewport henüz oturmamışsa) çubuk sonsuza dek
   * gizli kalırdı; her karede yeniden hesaplanınca böyle bir kilit oluşmaz.
   */
  useEffect(() => {
    const target = document.getElementById(BUY_BLOCK_ID)
    if (!target) return

    let frame = 0
    const measure = () => {
      frame = 0
      const kutu = target.getBoundingClientRect()
      const orta = kutu.top + kutu.height / 2
      setDugmeGorunmuyor(!(orta > 56 && orta < window.innerHeight - 8))

      const vv = window.visualViewport
      // Klavye ekranın altından belirgin bir pay kapatır; küçük tarayıcı
      // çubukları (ör. 60-80px) çubuğu gizlemeye yetmemeli.
      setKeyboardOpen(Boolean(vv) && vv!.height < window.innerHeight - 150)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [])

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null
      setInputFocused(
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      )
    }
    const onBlur = () => setInputFocused(false)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
  }, [])

  const handleAdd = useCallback(() => {
    if (outOfStock || added) return

    // Bedenli üründe seçim teyit edilmeden eklenmez: sayfa beden bölümüne
    // kayar ve seçim bir kez vurgulanır.
    if (hasSizes && !sizeConfirmed.current) {
      const section = document.getElementById(SIZE_BLOCK_ID)
      if (section) {
        sizeConfirmed.current = true
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        section.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
        section.classList.remove('size-flash')
        void section.offsetWidth
        section.classList.add('size-flash')
        return
      }
    }

    addItem(product, 1, 'yapiskan')
    // Faz 11A: mobil çubuktan eklemede de sepet paneli açılır.
    panelAc()
    setAdded(true)
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
  }, [addItem, added, hasSizes, outOfStock, product, panelAc])

  const show = dugmeGorunmuyor && !inputFocused && !keyboardOpen

  return (
    <div
      className="sticky-buy sm:hidden fixed bottom-[var(--nb-consent-h,0px)] inset-x-0 z-40 bg-bg/95 backdrop-blur-sm border-t border-line"
      data-show={show ? 'true' : 'false'}
      aria-hidden={!show}
    >
      {/* Fiyat solda ve belirgin, düğme 48 px (eski düğme 37 px'ti). Alt satır
          iki sözü tekrar eder; ürün adı yalnız ekran okuyucuya okunur. */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <span className="sr-only">{title}</span>
          {/* Faz 11A: çubuk liste fiyatını gösteriyordu; aynı sayfanın
              üstünde indirimli fiyat yazarken burada tam fiyat çıkıyordu. */}
          <p className="price text-[17px] leading-tight text-ink">
            {formatPrice(fiyat.gosterilen)}
            {fiyat.ustuCizili != null && (
              <span className="ml-2 text-[12px] font-normal text-muted line-through">
                {formatPrice(fiyat.ustuCizili)}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate font-body text-[12px] text-muted">
            {FREE_SHIPPING_SHORT} · {GUVEN_METNI.iade}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          tabIndex={show ? 0 : -1}
          className={`basis min-h-[48px] shrink-0 rounded-[4px] px-6 font-body text-[13px] font-semibold uppercase tracking-[0.1em] ${
            outOfStock ? 'bg-line text-muted cursor-not-allowed' : 'bg-ink text-white'
          }`}
        >
          {outOfStock ? 'Tükendi' : added ? 'Eklendi ✓' : 'Sepete Ekle'}
        </button>
      </div>
    </div>
  )
}
