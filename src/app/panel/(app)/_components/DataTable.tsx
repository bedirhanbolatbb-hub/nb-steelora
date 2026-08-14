'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DataTableColumn = {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right'
  /** Dar ekranda gizlenecek ikincil kolonlar için */
  hideOnMobile?: boolean
}

export type DataTableRow = {
  id: string
  /** Sıralama için ham değerler (sayı ya da metin) */
  sort?: Record<string, string | number>
  /** Basılacak hücreler — sunucudan JSX olarak gelebilir */
  cells: Record<string, ReactNode>
}

/**
 * Panelin tablo bileşeni: sıralanabilir başlıklar, yapışkan başlık satırı,
 * boş durum. Satır içerikleri JSX olarak dışarıdan gelir; sıralama `sort`
 * içindeki ham değerlerle yapılır — hücre süslemesi sıralamayı bozmaz.
 */
export default function DataTable({
  columns,
  rows,
  emptyText = 'Kayıt yok.',
  maxHeight,
}: {
  columns: DataTableColumn[]
  rows: DataTableRow[]
  emptyText?: string
  maxHeight?: string
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [dir, setDir] = useState<1 | -1>(-1)

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const x = a.sort?.[sortKey]
      const y = b.sort?.[sortKey]
      if (x == null || y == null) return 0
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return String(x).localeCompare(String(y), 'tr') * dir
    })
  }, [rows, sortKey, dir])

  const toggle = (key: string) => {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setDir(-1)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">{emptyText}</p>
    )
  }

  return (
    <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-[var(--p-surface)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'border-b border-[var(--p-line)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--p-muted)]',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.hideOnMobile && 'hidden sm:table-cell'
                )}
              >
                {col.sortable ? (
                  <button
                    onClick={() => toggle(col.key)}
                    className="inline-flex min-h-[28px] items-center gap-1 hover:text-[var(--p-ink)] transition-colors"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      dir === 1 ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-[var(--p-line)]/60 last:border-0 hover:bg-[var(--p-bg)]/60">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-2.5 align-middle text-[var(--p-ink)]',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    col.hideOnMobile && 'hidden sm:table-cell'
                  )}
                >
                  {row.cells[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
