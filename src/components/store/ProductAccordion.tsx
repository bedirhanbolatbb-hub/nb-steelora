'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Section = {
  title: string
  content: React.ReactNode
}

export default function ProductAccordion({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.title ?? null)

  return (
    <div className="mt-8 border-t border-line">
      {sections.map((section) => {
        const isOpen = open === section.title
        return (
          <div key={section.title} className="border-b border-line">
            <button
              onClick={() => setOpen(isOpen ? null : section.title)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between py-4 text-left"
            >
              <span className="text-[11px] font-body font-semibold uppercase tracking-[0.15em] text-ink">
                {section.title}
              </span>
              <ChevronDown
                size={16}
                className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="pb-5 text-[13px] font-body text-ink-soft leading-relaxed">
                {section.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
