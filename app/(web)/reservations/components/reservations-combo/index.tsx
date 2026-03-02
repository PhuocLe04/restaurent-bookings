'use client'

import {
  ReactElement,
  JSXElementConstructor,
  ReactNode,
  ReactPortal,
} from 'react'
import type { Combo, ComboDetail } from '../index'

export default function ReservationCombo(props: {
  combos: Combo[]
  comboId: string
  setComboId: (v: string) => void
  comboDetail: ComboDetail | null
  onApplyCombo: () => void
}) {
  const { combos, comboId, setComboId, comboDetail, onApplyCombo } = props

  return (
    <div className="mt-4 rounded-lg border p-4">
      <div className="text-sm font-medium">Combo (gồm món + dịch vụ)</div>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <div>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={comboId}
            onChange={(e) => setComboId(e.target.value)}
          >
            <option value="">-- Chọn combo --</option>
            {combos.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title} (Giá {c.sale_price.toLocaleString('vi-VN')}₫)
              </option>
            ))}
          </select>

          {comboDetail && (
            <div className="mt-2 rounded-md border p-2 text-xs">
              <div className="font-medium">{comboDetail.title}</div>
              {comboDetail.description && (
                <div className="text-muted-foreground">
                  {comboDetail.description}
                </div>
              )}

              <div className="mt-2">
                <div className="font-medium">Bao gồm:</div>
                <ul className="list-disc pl-5">
                  {comboDetail.combo_menu_items?.map(
                    (x: {
                      menu_item_id: any
                      menu_items: {
                        name:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined
                      }
                      quantity:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<
                            unknown,
                            string | JSXElementConstructor<any>
                          >
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<
                                unknown,
                                string | JSXElementConstructor<any>
                              >
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined
                    }) => (
                      <li key={`m-${x.menu_item_id}`}>
                        {x.menu_items?.name} × {x.quantity}
                      </li>
                    ),
                  )}
                  {comboDetail.combo_services?.map(
                    (x: {
                      service_id: any
                      services: {
                        name:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined
                      }
                      quantity:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<
                            unknown,
                            string | JSXElementConstructor<any>
                          >
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<
                                unknown,
                                string | JSXElementConstructor<any>
                              >
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined
                    }) => (
                      <li key={`s-${x.service_id}`}>
                        {x.services?.name} × {x.quantity}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start justify-end">
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={onApplyCombo}
            disabled={!comboDetail}
          >
            Áp dụng combo
          </button>
        </div>
      </div>
    </div>
  )
}
