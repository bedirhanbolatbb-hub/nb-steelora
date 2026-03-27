import { cn } from '@/lib/utils'

interface BadgeProps {
  variant: 'new' | 'bestseller' | 'sale'
  className?: string
}

const labels: Record<BadgeProps['variant'], string> = {
  new: 'YENİ',
  bestseller: 'ÇOK SATAN',
  sale: 'İNDİRİM',
}

export default function Badge({ variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block px-3 py-1 text-[9px] font-medium uppercase tracking-[0.15em] font-body',
        {
          'bg-gold text-white': variant === 'new',
          'bg-dark text-champagne': variant === 'bestseller',
          'bg-red-700 text-white': variant === 'sale',
        },
        className
      )}
    >
      {labels[variant]}
    </span>
  )
}
