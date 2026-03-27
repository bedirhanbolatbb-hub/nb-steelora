'use client'

import { X, Minus, Plus, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-dark/50 z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-champagne z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-champagne-mid">
          <h2 className="font-heading text-[20px] text-text-primary">Sepetiniz</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-gold transition-colors" aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <ShoppingBag size={48} className="text-champagne-mid mb-4" />
          <p className="text-[13px] font-body text-text-muted">Sepetiniz boş</p>
          <Button variant="outline" className="mt-6" onClick={onClose}>
            Alışverişe Başla
          </Button>
        </div>
      </div>
    </>
  )
}
