'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Açık katmanların (mobil menü, arama, sepet paneli) klavye sözleşmesi
 * (Faz 11B eksik-arama denetimi).
 *
 * ÖLÇÜLEN KUSURLAR (390px + 1440px, canlı):
 *  · Escape HİÇBİR katmanı kapatmıyordu — arama katmanında klavye
 *    kullanıcısının kapanış yolu yoktu (perde tıklamaları yutuyor, Tab
 *    perdenin arkasındaki sayfaya kaçıyordu). KRİTİK.
 *  · Odak katmana taşınmıyordu: menü açıkken ilk üç Tab arkadaki başlığa
 *    gidiyor, arka sayfa klavyeyle kayıyordu (scrollY 0→851).
 *  · Kapanınca odak açan düğmeye dönmüyordu.
 *
 * Bu kanca üçünü tek yerden çözer:
 *  1) Escape → kapat.
 *  2) Tab, katmanın İÇİNDE döner (odak tuzağı); odak dışarıdaysa içeri alınır.
 *  3) Açılışta odak katmandaki ilk odaklanabilir ögeye (ya da
 *     [data-katman-odak] işaretli ögeye) taşınır; kapanışta açan ögeye döner.
 *
 * Dinleyici yalnız katman AÇIKKEN takılıdır; katmanlar bu sitede aynı anda
 * tek açık olduğu için (menü tam ekran, arama/sepet birbirini dışlar)
 * yarışma olmaz.
 */
export function useKatmanKlavyesi(
  acik: boolean,
  kapat: () => void,
  kapRef: RefObject<HTMLElement | null>,
  secenekler?: { ilkOdak?: boolean }
): void {
  const ilkOdak = secenekler?.ilkOdak ?? true

  useEffect(() => {
    if (!acik) return
    const oncekiOdak = document.activeElement

    const odaklanabilirler = (): HTMLElement[] => {
      const kap = kapRef.current
      if (!kap) return []
      return [
        ...kap.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => {
        const s = getComputedStyle(el)
        return s.display !== 'none' && s.visibility !== 'hidden'
      })
    }

    if (ilkOdak) {
      const kap = kapRef.current
      const hedef =
        kap?.querySelector<HTMLElement>('[data-katman-odak]') ?? odaklanabilirler()[0]
      hedef?.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        kapat()
        return
      }
      if (e.key !== 'Tab') return
      const liste = odaklanabilirler()
      if (!liste.length) return
      const kap = kapRef.current
      const aktif = document.activeElement
      const disarida = !kap || !(aktif instanceof Node) || !kap.contains(aktif)
      const ilk = liste[0]
      const son = liste[liste.length - 1]
      if (disarida) {
        e.preventDefault()
        ;(e.shiftKey ? son : ilk).focus()
      } else if (!e.shiftKey && aktif === son) {
        e.preventDefault()
        ilk.focus()
      } else if (e.shiftKey && aktif === ilk) {
        e.preventDefault()
        son.focus()
      }
    }

    // capture: sayfadaki başka dinleyiciler (ör. hero'nun ok tuşları) katman
    // açıkken tuşları görmesin.
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (oncekiOdak instanceof HTMLElement) oncekiOdak.focus()
    }
  }, [acik, kapat, kapRef, ilkOdak])
}
