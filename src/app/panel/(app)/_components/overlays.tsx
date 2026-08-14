'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PButton } from './ui'

/* ── Toast ───────────────────────────────────────────────────────────── */
type Toast = { id: number; message: string; tone: 'success' | 'danger' | 'neutral' }

const ToastContext = createContext<{ push: (message: string, tone?: Toast['tone']) => void }>({
  push: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Toast['tone'] = 'neutral') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {/* Mobilde alt sekme çubuğunun üstünde durur */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'panel-toast pointer-events-auto max-w-md rounded-[6px] border px-4 py-2.5 text-[13px] shadow-lg',
              toast.tone === 'success' &&
                'border-[var(--p-success)]/30 bg-[var(--p-success-bg)] text-[var(--p-success)]',
              toast.tone === 'danger' &&
                'border-[var(--p-danger)]/30 bg-[var(--p-danger-bg)] text-[var(--p-danger)]',
              toast.tone === 'neutral' &&
                'border-[var(--p-line)] bg-[var(--p-surface)] text-[var(--p-ink)]'
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ── Dialog ──────────────────────────────────────────────────────────── */
export function PDialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--p-ink)]/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-[8px] border border-[var(--p-line)] bg-[var(--p-surface)] sm:rounded-[8px]">
        <header className="flex items-center justify-between border-b border-[var(--p-line)] px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[var(--p-ink)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-[4px] text-[var(--p-muted)] hover:text-[var(--p-ink)] transition-colors"
          >
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[70dvh] overflow-y-auto p-4 text-[13px] text-[var(--p-ink)]">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-[var(--p-line)] px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ── Tabs ────────────────────────────────────────────────────────────── */
export function PTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--p-line)]" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'min-h-[44px] whitespace-nowrap border-b-2 px-3 text-[13px] transition-colors',
            value === tab.id
              ? 'border-[var(--p-ink)] font-semibold text-[var(--p-ink)]'
              : 'border-transparent text-[var(--p-muted)] hover:text-[var(--p-ink)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export { PButton }
