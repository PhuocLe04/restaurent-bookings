'use client'

import type { Service } from '../index'
import '@/app/(web)/reservations/page.css'

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
    <section className="reservation-block">
      <div className="reservation-block__header">
        <div>
          <h3 className="reservation-block__title">Chọn dịch vụ</h3>
          <p className="reservation-block__subtitle">
            Bổ sung dịch vụ phù hợp để trải nghiệm tại nhà hàng trọn vẹn hơn.
          </p>
        </div>

        <div className="reservation-block__count">
          {servicesCount} dịch vụ đã chọn
        </div>
      </div>

      <div className="reservation-service-toolbar">
        <input
          className="reservation-control"
          placeholder="Tìm dịch vụ..."
          value={serviceQuery}
          onChange={(e) => setServiceQuery(e.target.value)}
        />

        <button
          type="button"
          className="reservation-outline-btn"
          onClick={onClearServices}
          disabled={!servicesCount}
        >
          Xóa dịch vụ
        </button>
      </div>

      <div className="reservation-service-scroll">
        <div className="reservation-service-grid">
          {filteredServices.map((s) => {
            const qty = selectedServices[s.id] ?? 0

            return (
              <div key={s.id} className="reservation-service-card">
                <div className="reservation-service-card__media">
                  {s.image ? (
                    <img
                      src={s.image}
                      alt={s.name}
                      className="reservation-service-card__image"
                    />
                  ) : (
                    <div className="reservation-service-card__placeholder">
                      Không có ảnh
                    </div>
                  )}
                </div>

                <div className="reservation-service-card__body">
                  <div className="reservation-service-card__top">
                    <div className="reservation-service-card__info">
                      <h4 className="reservation-service-card__name">
                        {s.name}
                      </h4>

                      {s.description && (
                        <div className="reservation-service-card__desc">
                          {s.description}
                        </div>
                      )}
                    </div>

                    <div className="reservation-service-card__price">
                      {s.price.toLocaleString('vi-VN')}₫
                    </div>
                  </div>

                  <div className="reservation-service-card__bottom">
                    <div className="reservation-qty">
                      <button
                        type="button"
                        className="reservation-qty__btn"
                        onClick={() => (qty > 0 ? onDecService(s.id) : null)}
                        disabled={qty <= 0}
                      >
                        −
                      </button>

                      <div className="reservation-qty__value">{qty}</div>

                      <button
                        type="button"
                        className="reservation-qty__btn"
                        onClick={() => onIncService(s.id)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {!filteredServices.length && (
            <div className="reservation-empty">
              Không có dịch vụ phù hợp với từ khóa tìm kiếm.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
