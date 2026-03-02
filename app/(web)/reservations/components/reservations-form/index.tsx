'use client'

import type { TableType } from '../index'

export default function ReservationForm(props: {
  guests: number
  setGuests: (v: number) => void
  tableCount: number
  setTableCount: (v: number) => void
  tableTypes: TableType[]
  tableTypeId: string
  setTableTypeId: (v: string) => void
  chosenType: TableType | null
  timeLocal: string
  setTimeLocal: (v: string) => void
  minTimeLocal: string
}) {
  const {
    guests,
    setGuests,
    tableCount,
    setTableCount,
    tableTypes,
    tableTypeId,
    setTableTypeId,
    chosenType,
    timeLocal,
    setTimeLocal,
    minTimeLocal,
  } = props

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium">Thời gian</label>
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={timeLocal}
          min={minTimeLocal}
          onChange={(e) => setTimeLocal(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Thời gian đặt bàn từ <b>7h30 đến 20h30</b>.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Số khách</label>
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Số lượng bàn</label>
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={tableCount}
          onChange={(e) => setTableCount(Number(e.target.value))}
        />
        {tableCount > guests && (
          <p className="mt-1 text-xs text-red-600">
            Số lượng bàn không được lớn hơn số khách.
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Loại bàn</label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={tableTypeId}
          onChange={(e) => setTableTypeId(e.target.value)}
        >
          {tableTypes.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>

        {chosenType && (
          <div className="mt-2 rounded-md border p-2 text-xs">
            <div className="font-medium">{chosenType.name}</div>
            {chosenType.description && (
              <div className="text-muted-foreground">
                {chosenType.description}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
