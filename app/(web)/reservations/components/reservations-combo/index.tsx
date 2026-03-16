'use client'

import type { Combo, ComboDetail } from '../index'
import '@/app/(web)/reservations/page.css'

export default function ReservationCombo(props: {
  combos: Combo[]
  comboId: string
  setComboId: (v: string) => void
  comboDetail: ComboDetail | null
  onApplyCombo: () => void
}) {
  const { combos, comboId, setComboId, comboDetail, onApplyCombo } = props

  return (
    <section className="reservation-block">
      <div className="reservation-block__header">
        <div>
          <h3 className="reservation-block__title">Combo ưu đãi</h3>
          <p className="reservation-block__subtitle">
            Chọn combo gồm món ăn và dịch vụ để tiết kiệm hơn.
          </p>
        </div>

        {comboDetail && (
          <div className="reservation-block__count">
            {comboDetail.sale_price.toLocaleString('vi-VN')}₫
          </div>
        )}
      </div>

      <div className="reservation-combo-panel">
        <label className="reservation-field__label">Chọn combo</label>

        <select
          className="reservation-control"
          value={comboId}
          onChange={(e) => setComboId(e.target.value)}
        >
          <option value="">-- Chọn combo --</option>
          {combos.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.title} - {c.sale_price.toLocaleString('vi-VN')}₫
            </option>
          ))}
        </select>

        {!comboDetail && (
          <div className="reservation-empty reservation-empty--combo">
            Hãy chọn một combo để xem chi tiết.
          </div>
        )}

        {comboDetail && (
          <div className="reservation-combo-card">
            <div className="reservation-combo-card__top">
              <div>
                <h4 className="reservation-combo-card__title">
                  {comboDetail.title}
                </h4>

                {comboDetail.description && (
                  <p className="reservation-combo-card__desc">
                    {comboDetail.description}
                  </p>
                )}
              </div>

              <div className="reservation-combo-pricing">
                <div className="reservation-combo-pricing__sale">
                  {comboDetail.sale_price.toLocaleString('vi-VN')}₫
                </div>

                {comboDetail.total_origin_price > comboDetail.sale_price && (
                  <div className="reservation-combo-pricing__origin">
                    {comboDetail.total_origin_price.toLocaleString('vi-VN')}₫
                  </div>
                )}
              </div>
            </div>

            <div className="reservation-combo-sections">
              <div className="reservation-combo-group">
                <div className="reservation-combo-group__label">
                  Món ăn bao gồm
                </div>

                {comboDetail.combo_menu_items?.length ? (
                  <div className="reservation-combo-list">
                    {comboDetail.combo_menu_items.map((x) => (
                      <div
                        key={`m-${x.menu_item_id}`}
                        className="reservation-combo-item"
                      >
                        <span className="reservation-combo-item__name">
                          {x.menu_items?.name}
                        </span>
                        <span className="reservation-combo-item__qty">
                          × {x.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="reservation-combo-empty">
                    Không có món trong combo này.
                  </div>
                )}
              </div>

              <div className="reservation-combo-group">
                <div className="reservation-combo-group__label">
                  Dịch vụ bao gồm
                </div>

                {comboDetail.combo_services?.length ? (
                  <div className="reservation-combo-list">
                    {comboDetail.combo_services.map((x) => (
                      <div
                        key={`s-${x.service_id}`}
                        className="reservation-combo-item"
                      >
                        <span className="reservation-combo-item__name">
                          {x.services?.name}
                        </span>
                        <span className="reservation-combo-item__qty">
                          × {x.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="reservation-combo-empty">
                    Không có dịch vụ trong combo này.
                  </div>
                )}
              </div>
            </div>

            <div className="reservation-combo-card__actions">
              <button
                type="button"
                className="reservation-submit reservation-submit--combo"
                onClick={onApplyCombo}
                disabled={!comboDetail}
              >
                Áp dụng combo
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
