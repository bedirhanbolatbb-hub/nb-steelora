import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Altın yalnız vurgu rengidir; buton zeminleri ink/ivory.
          'basis inline-flex items-center justify-center font-body font-medium uppercase tracking-[0.15em] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-ink text-bg hover:bg-accent-deep': variant === 'primary',
            'border border-ink text-ink hover:bg-ink hover:text-bg': variant === 'outline',
            'text-muted hover:text-accent-deep': variant === 'ghost',
          },
          {
            'text-[10px] px-4 py-2': size === 'sm',
            'text-[11px] px-6 py-3': size === 'md',
            'text-[12px] px-8 py-4': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button
