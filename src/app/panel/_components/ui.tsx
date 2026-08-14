import { cn } from '@/lib/utils'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/**
 * Panel bileşen kiti — sunucuda da istemcide de kullanılabilen parçalar.
 * Vitrin bileşenleri buraya KOPYALANMAZ; panel kendi tek dilinde konuşur.
 * Renkler panel.css token'larından gelir (--p-*).
 */

/* ── Button ──────────────────────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'ghost' | 'danger'

export function PButton({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[4px] px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' &&
          'bg-[var(--p-ink)] text-white hover:bg-[var(--p-accent-deep)]',
        variant === 'ghost' &&
          'border border-[var(--p-line)] bg-[var(--p-surface)] text-[var(--p-ink)] hover:border-[var(--p-ink)]',
        variant === 'danger' &&
          'border border-[var(--p-danger)]/30 bg-[var(--p-danger-bg)] text-[var(--p-danger)] hover:border-[var(--p-danger)]',
        className
      )}
      {...props}
    />
  )
}

/* ── Form alanları ───────────────────────────────────────────────────── */
const fieldBase =
  'w-full rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] px-3 py-2 text-[13px] text-[var(--p-ink)] placeholder:text-[var(--p-muted)] focus:border-[var(--p-accent)] focus:outline-none transition-colors'

export function PInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'min-h-[36px]', className)} {...props} />
}

export function PSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, 'min-h-[36px]', className)} {...props} />
}

export function PTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'resize-y', className)} {...props} />
}

/* ── Badge — durum renkleri ─────────────────────────────────────────── */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent'

const badgeTones: Record<BadgeTone, string> = {
  success: 'bg-[var(--p-success-bg)] text-[var(--p-success)] border-[var(--p-success)]/25',
  warning: 'bg-[var(--p-warning-bg)] text-[var(--p-warning)] border-[var(--p-warning)]/25',
  danger: 'bg-[var(--p-danger-bg)] text-[var(--p-danger)] border-[var(--p-danger)]/25',
  neutral: 'bg-[var(--p-bg)] text-[var(--p-ink-soft)] border-[var(--p-line)]',
  accent: 'bg-[#f5efe2] text-[var(--p-accent-deep)] border-[var(--p-accent)]/30',
}

export function PBadge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-[1.4] whitespace-nowrap',
        badgeTones[tone]
      )}
    >
      {children}
    </span>
  )
}

/** Sipariş durumu → rozet tonu ve Türkçe etiketi (tek kaynak). */
export const ORDER_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Bekliyor', tone: 'warning' },
  paid: { label: 'Ödendi', tone: 'accent' },
  preparing: { label: 'Hazırlanıyor', tone: 'accent' },
  shipped: { label: 'Kargoda', tone: 'neutral' },
  delivered: { label: 'Teslim edildi', tone: 'success' },
  cancelled: { label: 'İptal', tone: 'danger' },
  refunded: { label: 'İade edildi', tone: 'danger' },
}

/* ── Card ────────────────────────────────────────────────────────────── */
export function PCard({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)]',
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-[var(--p-line)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--p-ink)]">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/* ── EmptyState ──────────────────────────────────────────────────────── */
export function PEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-[var(--p-line)] bg-[var(--p-surface)] px-6 py-16 text-center">
      {icon && <div className="mb-3 text-[var(--p-muted)]">{icon}</div>}
      <p className="text-[14px] font-semibold text-[var(--p-ink)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--p-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────── */
export function PSkeleton({ className }: { className?: string }) {
  return <div className={cn('panel-skeleton h-4 w-full', className)} aria-hidden />
}
