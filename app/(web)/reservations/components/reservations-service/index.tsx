'use client'

import type { Service } from '../index'

export default function ReservationService(props: {
  enableServices: boolean
  serviceQuery: string
  setServiceQuery: (v: string) => void
  filteredServices: Service[]
  selectedServices: Record<number, number>
  onIncService: (id: number) => void
  onDecService: (id: number) => void
  onClearServices: () => void
  servicesCount: number
}) {
  const {
    enableServices,
    serviceQuery,
    setServiceQuery,
    filteredServices,
    selectedServices,
    onIncService,
    onDecService,
    onClearServices,
    servicesCount,
  } = props

  if (!enableServices) return null

  return (
    <div className="mt-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium">Chọn dịch vụ</div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Tìm dịch vụ..."
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
          />

          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            onClick={onClearServices}
            disabled={!servicesCount}
          >
            Xoá dịch vụ
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filteredServices.map((s) => {
          const qty = selectedServices[s.id] ?? 0
          return (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.name}</div>
                  {s.description && (
                    <div className="text-xs text-muted-foreground">
                      {s.description}
                    </div>
                  )}
                  <div className="mt-1 text-sm">
                    {s.price.toLocaleString('vi-VN')}₫
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border text-sm disabled:opacity-50"
                    onClick={() => (qty > 0 ? onDecService(s.id) : null)}
                    disabled={qty <= 0}
                  >
                    -
                  </button>
                  <div className="w-6 text-center text-sm">{qty}</div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border text-sm"
                    onClick={() => onIncService(s.id)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {!filteredServices.length && (
          <div className="text-sm text-muted-foreground">
            Không có dịch vụ phù hợp.
          </div>
        )}
      </div>
    </div>
  )
}
