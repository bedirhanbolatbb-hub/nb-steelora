import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Alanın ÜSTÜNDE görünen etiket (24 Kas 2026 tasarım denetimi). Verilirse
   * alan <label> ile sarılır. Eskiden etiket yalnız yer tutucuydu: yazmaya
   * başlayınca kayboluyor, dolu formda hangi kutunun ne olduğu okunmuyordu.
   */
  etiket?: string
  /** Alanın altında tek satır açıklama (ör. e-postanın neden istendiği). */
  ipucu?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, etiket, ipucu, ...props }, ref) => {
    const alan = (
      <input
        ref={ref}
        className={cn(
          // Yazı boyutu mobilde 16px (text-base), sm ve üstünde tasarım ölçüsü
          // 14px (text-sm). iOS Safari 16px'ten KÜÇÜK bir alana dokunulduğunda
          // sayfayı otomatik yakınlaştırıyor ve kullanıcı ödeme formunda
          // yatay kaydırmaya mahkûm kalıyordu (Faz 19 ölçümü: 15/15 alan 14px).
          // Çizgi: line-strong (beyazda 3,3:1) — alan, alan olarak görünsün.
          'w-full border border-line-strong bg-white px-4 py-3 text-base sm:text-sm font-body text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-colors',
          className
        )}
        {...props}
      />
    )
    if (!etiket) return alan
    return (
      <label className="block">
        <span className="mb-1.5 block font-body text-[13px] text-ink-soft">
          {etiket}
          {props.required && (
            <span aria-hidden className="text-accent-deep">
              {' '}
              *
            </span>
          )}
        </span>
        {alan}
        {ipucu && (
          <span className="mt-1 block font-body text-[12px] leading-snug text-muted">{ipucu}</span>
        )}
      </label>
    )
  }
)

Input.displayName = 'Input'

export default Input
