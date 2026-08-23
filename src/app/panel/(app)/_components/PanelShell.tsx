'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ShoppingBag,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PANEL_GROUPS, titleFor } from './nav'
import { ToastProvider } from './overlays'

/**
 * Panel yerleşimi.
 * Masaüstü: sol kenar çubuğu (gruplu menü) + üst barda başlık ve breadcrumb.
 * Mobil (<640px): üst bar + altta 5 sekmelik çubuk; "Diğer", kalan modüllere
 * giden alttan açılır bir sheet. Dokunma hedefleri ≥44px.
 */

const MOBILE_TABS = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  { href: '/panel/siparisler', label: 'Siparişler', icon: ShoppingBag },
  { href: '/panel/urunler', label: 'Ürünler', icon: Package },
  { href: '/panel/blog', label: 'İçerik', icon: FileText },
]

export default function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { title, group } = titleFor(pathname)

  // Rota değişince sheet kapanır.
  useEffect(() => setSheetOpen(false), [pathname])

  const isActive = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href)

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        {/* ── Kenar çubuğu (masaüstü) ── */}
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-[var(--p-line)] bg-[var(--p-surface)] sm:flex">
          <Link href="/panel" className="block border-b border-[var(--p-line)] px-5 py-4">
            <span className="panel-brand text-[16px] tracking-[0.12em] text-[var(--p-ink)]">
              NB STEELORA
            </span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em] text-[var(--p-accent-deep)]">
              Yönetim
            </span>
          </Link>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {PANEL_GROUPS.map((g) => (
              <div key={g.title} className="mb-5">
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--p-muted)]">
                  {g.title}
                </p>
                <ul className="space-y-0.5">
                  {g.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          'block rounded-[4px] px-2 py-1.5 text-[13px] transition-colors',
                          isActive(link.href)
                            ? 'bg-[var(--p-bg)] font-semibold text-[var(--p-ink)] shadow-[inset_2px_0_0_var(--p-accent)]'
                            : 'text-[var(--p-ink-soft)] hover:bg-[var(--p-bg)] hover:text-[var(--p-ink)]'
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-[var(--p-line)] px-5 py-3">
            <a
              href="/"
              className="text-[12px] text-[var(--p-muted)] hover:text-[var(--p-ink)] transition-colors"
            >
              ← Vitrine dön
            </a>
          </div>
        </aside>

        {/* ── İçerik sütunu ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Üst bar: başlık + breadcrumb.
              Zemin OPAK: yarı saydam + blur, mobil kaydırmada içeriğin
              başlıkla üst üste binmiş görünmesine yol açıyordu (7A bulgusu). */}
          <header className="sticky top-0 z-40 border-b border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-3 sm:px-6">
            <nav className="text-[11px] text-[var(--p-muted)]" aria-label="breadcrumb">
              <Link href="/panel" className="hover:text-[var(--p-ink)] transition-colors">
                Panel
              </Link>
              {group && <span> / {group}</span>}
              {title !== 'Genel Bakış' && <span> / {title}</span>}
            </nav>
            <h1 className="mt-0.5 text-[17px] font-semibold text-[var(--p-ink)]">{title}</h1>
          </header>

          {/* Mobilde alt sekme çubuğunun altında içerik kalmasın */}
          <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:pb-8">{children}</main>
        </div>
      </div>

      {/* ── Mobil alt sekme çubuğu ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--p-line)] bg-[var(--p-surface)] sm:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px]',
                  active
                    ? 'font-semibold text-[var(--p-ink)]'
                    : 'text-[var(--p-muted)]'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
              </Link>
            )
          })}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] text-[var(--p-muted)]"
          >
            <MoreHorizontal size={18} strokeWidth={1.8} />
            Diğer
          </button>
        </div>
      </nav>

      {/* ── "Diğer" sheet'i (mobil) ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[var(--p-ink)]/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-[10px] border-t border-[var(--p-line)] bg-[var(--p-surface)] px-4 pb-8 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[var(--p-ink)]">Tüm modüller</p>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Kapat"
                className="flex h-11 w-11 items-center justify-center text-[var(--p-muted)]"
              >
                <X size={18} />
              </button>
            </div>
            {PANEL_GROUPS.map((g) => (
              <div key={g.title} className="mb-4">
                <p className="pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--p-muted)]">
                  {g.title}
                </p>
                <ul>
                  {g.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          'block min-h-[44px] rounded-[4px] px-2 py-2.5 text-[14px]',
                          isActive(link.href)
                            ? 'bg-[var(--p-bg)] font-semibold text-[var(--p-ink)]'
                            : 'text-[var(--p-ink-soft)]'
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToastProvider>
  )
}
