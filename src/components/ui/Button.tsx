import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

export type DugmeTuru = 'primary' | 'outline' | 'ghost'
export type DugmeBoyu = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DugmeTuru
  size?: DugmeBoyu
}

/**
 * Düğme görünümünün TEK kaynağı.
 *
 * 24 Kas 2026 tasarım denetimi: sitede altı ayrı düğme yüksekliği ve
 * 10–12 px etiket vardı. Tek aile, üç yükseklik: 44 / 48 / 52 px; etiket
 * 12–13 px, harf aralığı tek değer (.1em). Altın yalnız vurgu rengidir;
 * düğme zeminleri ink/ivory.
 *
 * <button> olmayan yerlerde (Link, <a>) aynı görünüm buradan alınır:
 *   <Link className={dugmeSinifi('outline', 'md')} …>
 * Elle yazılmış "px-8 py-3 text-[11px] uppercase…" dizileri bu yüzden yok;
 * yeni bir düğme gerekiyorsa buraya tür/boy eklenir.
 */
export function dugmeSinifi(
  variant: DugmeTuru = 'primary',
  size: DugmeBoyu = 'md',
  className?: string
): string {
  return cn(
    'basis inline-flex items-center justify-center text-center font-body font-semibold uppercase tracking-[0.1em] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'bg-ink text-white hover:bg-accent-deep': variant === 'primary',
      'border border-ink text-ink hover:bg-ink hover:text-bg': variant === 'outline',
      'text-ink-soft hover:text-ink': variant === 'ghost',
    },
    {
      'min-h-[44px] text-[12px] px-4 py-2': size === 'sm',
      'min-h-[48px] text-[13px] px-6 py-3': size === 'md',
      'min-h-[52px] text-[13px] px-8 py-4': size === 'lg',
    },
    className
  )
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return <button ref={ref} className={dugmeSinifi(variant, size, className)} {...props} />
  }
)

Button.displayName = 'Button'

export default Button
