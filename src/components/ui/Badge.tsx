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
        'inline-block px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.15em] font-body rounded-[2px]',
        {
          'bg-surface border border-accent-line text-accent-deep': variant === 'new',
          'bg-ink text-bg': variant === 'bestseller',
          'bg-accent-deep text-bg': variant === 'sale',
        },
        className
      )}
    >
      {labels[variant]}
    </span>
  )
}
