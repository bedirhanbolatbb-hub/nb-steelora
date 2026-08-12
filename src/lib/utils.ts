import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Sitedeki tek fiyat formatlayıcısı. Kuruş her zaman iki hane basılır ("₺399,90");
// elle string birleştirme (`${x}₺`, toFixed) kullanılmaz.
export function formatPrice(price: number | string | null | undefined): string {
  const value = typeof price === 'number' ? price : Number(price ?? 0)
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}
