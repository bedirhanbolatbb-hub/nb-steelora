import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Yazı boyutu mobilde 16px (text-base), sm ve üstünde tasarım ölçüsü
          // 14px (text-sm). iOS Safari 16px'ten KÜÇÜK bir alana dokunulduğunda
          // sayfayı otomatik yakınlaştırıyor ve kullanıcı ödeme formunda
          // yatay kaydırmaya mahkûm kalıyordu (Faz 19 ölçümü: 15/15 alan 14px).
          // Masaüstü görünümü değişmiyor.
          'w-full border border-line bg-white px-4 py-3 text-base sm:text-sm font-body text-ink placeholder:text-muted focus:border-accent-line focus:outline-none transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
