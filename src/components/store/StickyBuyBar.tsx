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
 * - Satın alma bloğu yukarı doğru ekrandan çıkınca görünür (IntersectionObserver).
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

  // Çubuk, satın alma bloğu YUKARI doğru ekrandan çıktığında belirir. Blok
  // henüz aşağıdaysa (sayfanın başı) çubuk yok: kullanıcı butonu görmeden
  // ekranı kapatmanın anlamı olmaz.
  useEffect(() => {
    const target = document.getElementById(BUY_BLOCK_ID)
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setPassedBuyBlock(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
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

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75)
    vv.addEventListener('resize', onResize)
    onResize()
    return () => vv.removeEventListener('resize', onResize)
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
      className="sticky-buy sm:hidden fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-sm border-t border-line"
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
