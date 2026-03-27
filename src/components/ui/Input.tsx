import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full border border-champagne-mid bg-white px-4 py-3 text-sm font-body text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
