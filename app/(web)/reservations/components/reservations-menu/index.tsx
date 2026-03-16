'use client'

import type { Category, MenuItem } from '../index'
import '@/app/(web)/reservations/page.css'

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
    <section className="reservation-block">
      <div className="reservation-block__header">
        <div>
          <h3 className="reservation-block__title">Chọn món trước</h3>
          <p className="reservation-block__subtitle">
            Chọn món yêu thích để nhà hàng chuẩn bị sẵn cho bạn.
          </p>
        </div>

        <div className="reservation-block__count">{itemsCount} món đã chọn</div>
      </div>

      <div className="reservation-menu-toolbar">
        <select
          className="reservation-control"
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
          className="reservation-control"
          placeholder="Tìm món ăn..."
          value={menuQuery}
          onChange={(e) => setMenuQuery(e.target.value)}
        />

        <button
          type="button"
          className="reservation-outline-btn"
          onClick={onClearItems}
          disabled={!itemsCount}
        >
          Xóa món
        </button>
      </div>

      <div className="reservation-menu-scroll">
        <div className="reservation-menu-grid">
          {filteredMenu.map((m) => {
            const qty = selectedItems[m.id] ?? 0

            return (
              <div key={m.id} className="reservation-menu-card">
                <div className="reservation-menu-card__media">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image}
                      alt={m.name}
                      className="reservation-menu-card__image"
                    />
                  ) : (
                    <div className="reservation-menu-card__placeholder">
                      Không có ảnh
                    </div>
                  )}
                </div>

                <div className="reservation-menu-card__body">
                  <div className="reservation-menu-card__top">
                    <div className="reservation-menu-card__info">
                      <h4 className="reservation-menu-card__name">{m.name}</h4>
                      <div className="reservation-menu-card__category">
                        {m.category?.name ?? 'Chưa phân loại'}
                      </div>
                    </div>

                    <div className="reservation-menu-card__price">
                      {m.price.toLocaleString('vi-VN')}₫
                    </div>
                  </div>

                  <div className="reservation-menu-card__bottom">
                    <div className="reservation-qty">
                      <button
                        type="button"
                        className="reservation-qty__btn"
                        onClick={() => (qty > 0 ? onDecItem(m.id) : null)}
                        disabled={qty <= 0}
                      >
                        −
                      </button>

                      <div className="reservation-qty__value">{qty}</div>

                      <button
                        type="button"
                        className="reservation-qty__btn"
                        onClick={() => onIncItem(m.id)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {!filteredMenu.length && (
            <div className="reservation-empty">
              Không có món phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
