'use client'

import type { Category, MenuItem } from '../index'

export default function ReservationMenu(props: {
  preorderFood: boolean
  categories: Category[]
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  menuQuery: string
  setMenuQuery: (v: string) => void
  filteredMenu: MenuItem[]
  selectedItems: Record<number, number>
  onIncItem: (id: number) => void
  onDecItem: (id: number) => void
  onClearItems: () => void
  itemsCount: number
}) {
  const {
    preorderFood,
    categories,
    categoryFilter,
    setCategoryFilter,
    menuQuery,
    setMenuQuery,
    filteredMenu,
    selectedItems,
    onIncItem,
    onDecItem,
    onClearItems,
    itemsCount,
  } = props

  if (!preorderFood) return null

  return (
    <div className="mt-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium">Chọn món</div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Tìm món..."
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
          />

          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            onClick={onClearItems}
            disabled={!itemsCount}
          >
            Xoá món
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filteredMenu.map((m) => {
          const qty = selectedItems[m.id] ?? 0
          return (
            <div key={m.id} className="rounded-md border p-3">
              <div className="flex items-start gap-3">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt={m.name}
                    className="h-14 w-14 rounded object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded bg-gray-100" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.category?.name ?? '—'}
                  </div>
                  <div className="mt-1 text-sm">
                    {m.price.toLocaleString('vi-VN')}₫
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border text-sm disabled:opacity-50"
                    onClick={() => (qty > 0 ? onDecItem(m.id) : null)}
                    disabled={qty <= 0}
                  >
                    -
                  </button>
                  <div className="w-6 text-center text-sm">{qty}</div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border text-sm"
                    onClick={() => onIncItem(m.id)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {!filteredMenu.length && (
          <div className="text-sm text-muted-foreground">
            Không có món phù hợp.
          </div>
        )}
      </div>
    </div>
  )
}
