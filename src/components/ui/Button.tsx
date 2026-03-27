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
          'inline-flex items-center justify-center font-body uppercase tracking-[0.15em] transition-all duration-300',
          {
            'bg-gold text-white hover:bg-gold-light': variant === 'primary',
            'border border-gold text-gold hover:bg-gold hover:text-white': variant === 'outline',
            'text-text-secondary hover:text-gold': variant === 'ghost',
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
