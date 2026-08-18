'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

/** Satın alma bloğunun ve beden bölümünün çıpaları — PDP'de basılır. */
export const BUY_BLOCK_ID = 'buy-block'
export const SIZE_BLOCK_ID = 'beden-secimi'

const ADDED_FEEDBACK_MS = 1600

/**
 * Yalnız dar ekranda (sm altı) görünen yapışkan satın alma çubuğu.
 *
 * Görünürlük kuralları:
 * - Satın alma bloğu yukarı doğru ekrandan çıkınca görünür (kaydırmada ölçülür).
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
  const addItem = useCart((s) => s.addItem)
  const [passedBuyBlock, setPassedBuyBlock] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [added, setAdded] = useState(false)
  // Beden seçimi bir kez teyit edildiyse çubuk doğrudan sepete ekler.
  const sizeConfirmed = useRef(false)

  /**
   * Çubuk, satın alma bloğu YUKARI doğru ekrandan çıktığında belirir. Blok
   * henüz aşağıdaysa (sayfanın başı) çubuk yok: kullanıcı butonu görmeden
   * ekranı kapatmanın anlamı olmaz.
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
      setPassedBuyBlock(target.getBoundingClientRect().bottom < 0)

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

    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
  }, [addItem, added, hasSizes, outOfStock, product])

  const show = passedBuyBlock && !inputFocused && !keyboardOpen

  return (
    <div
      className="sticky-buy sm:hidden fixed bottom-[var(--nb-consent-h,0px)] inset-x-0 z-40 bg-bg/95 backdrop-blur-sm border-t border-line"
      data-show={show ? 'true' : 'false'}
      aria-hidden={!show}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-body text-ink truncate">{title}</p>
          <p className="price text-[14px] text-ink leading-tight">{formatPrice(price)}</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          tabIndex={show ? 0 : -1}
          className={`shrink-0 px-5 py-2.5 text-[11px] tracking-[0.15em] uppercase font-body font-medium rounded-[4px] transition-colors ${
            outOfStock ? 'bg-line text-muted cursor-not-allowed' : 'bg-ink text-bg'
          }`}
        >
          {outOfStock ? 'Tükendi' : added ? 'Eklendi ✓' : 'Sepete Ekle'}
        </button>
      </div>
    </div>
  )
}
