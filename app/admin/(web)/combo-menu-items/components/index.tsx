'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

type Item = {
  combo_id: number
  menu_item_id: number
  quantity: number
  unit_price: number | string
  combo?: {
    id: number
    title: string
  } | null
  menu_items?: {
    id: number
    name: string
  } | null
}

type ComboOption = {
  id: number
  title: string
}

type ListResponse = {
  items: Item[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type ComboListResponse = {
  items: ComboOption[]
}

export default function ComboMenuItemsIndex() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [comboOptions, setComboOptions] = useState<ComboOption[]>([])
  const [comboId, setComboId] = useState('')

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  async function loadCombos() {
    try {
      const res = await fetch('/admin/api/combo?page=1&limit=1000', {
        cache: 'no-store',
      })
      const data: ComboListResponse & { message?: string } = await res.json()

      if (!res.ok) return
      setComboOptions(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadData(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (comboId) params.set('combo_id', comboId)

      const res = await fetch(
        `/admin/api/combo-menu-items?${params.toString()}`,
        {
          cache: 'no-store',
        },
      )
      const data: ListResponse & { message?: string } = await res.json()

      if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách')

      setItems(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (e: any) {
      setError(e.message || 'Đã có lỗi xảy ra')
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleDelete(comboId: number, menuItemId: number) {
    if (!confirm('Bạn có chắc muốn xóa dòng này?')) return
    try {
      const res = await fetch(
        `/admin/api/combo-menu-items/${comboId}/${menuItemId}`,
        { method: 'DELETE' },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xóa thất bại')

      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await loadData(true)
      }
    } catch (e: any) {
      alert(e.message || 'Xóa thất bại')
    }
  }

  useEffect(() => {
    loadCombos()
  }, [])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, comboId])

  const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString('vi-VN')
  }

  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1
  const toItem = total === 0 ? 0 : Math.min(page * limit, total)

  return (
    <div className="combo-menu-items-page">
      {/* Header */}
      <div className="combo-menu-items-head">
        <div>
          <h1 className="admin-title">Quản lý món trong combo</h1>
        </div>

        <div className="combo-menu-items-head-actions">
          <Link
            href="/admin/combo-menu-items/create"
            className="combo-menu-items-btn combo-menu-items-btn-primary"
          >
            + Thêm món vào combo
          </Link>
          <button
            type="button"
            className="combo-menu-items-btn combo-menu-items-btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <span
              className={refreshing ? 'combo-menu-items-refresh-icon' : ''}
            ></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="combo-menu-items-toolbar">
        <div className="combo-menu-items-filters">
          <select
            value={comboId}
            onChange={(e) => {
              setPage(1)
              setComboId(e.target.value)
            }}
          >
            <option value="">Tất cả combo</option>
            {comboOptions.map((combo) => (
              <option key={combo.id} value={String(combo.id)}>
                {combo.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && <div className="combo-menu-items-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="combo-menu-items-card">
        <div className="combo-menu-items-table-wrap">
          <table className="combo-menu-items-table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>Combo</th>
                <th style={{ width: 200 }}>Món ăn</th>
                <th style={{ width: 100 }}>Số lượng</th>
                <th style={{ width: 120 }}>Đơn giá</th>
                <th style={{ width: 220 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="combo-menu-items-td-muted combo-menu-items-loading-shimmer"
                  >
                    Đang tải danh sách món trong combo...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="combo-menu-items-td-muted">
                    Không có dữ liệu món trong combo
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.combo_id}-${item.menu_item_id}`}>
                    <td>
                      <div className="combo-menu-items-info">
                        <div className="combo-menu-items-details">
                          <span
                            className="combo-menu-items-title"
                            title={item.combo?.title}
                          >
                            {item.combo?.title || `Combo #${item.combo_id}`}
                          </span>
                          <span className="combo-menu-items-subtitle">
                            ID: {item.combo_id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="combo-menu-items-info">
                        <div className="combo-menu-items-details">
                          <span
                            className="combo-menu-items-title"
                            title={item.menu_items?.name}
                          >
                            {item.menu_items?.name ||
                              `Món #${item.menu_item_id}`}
                          </span>
                          <span className="combo-menu-items-subtitle">
                            ID: {item.menu_item_id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="combo-menu-items-quantity">
                        {item.quantity}
                      </span>
                    </td>
                    <td>
                      <span className="combo-menu-items-price">
                        {formatCurrency(item.unit_price)}
                        <span className="combo-menu-items-price-unit">đ</span>
                      </span>
                    </td>
                    <td>
                      <div className="combo-menu-items-actions-row">
                        <Link
                          href={`/admin/combo-menu-items/${item.combo_id}/${item.menu_item_id}`}
                          className="combo-menu-items-btn"
                          title="Xem chi tiết"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="combo-menu-items-btn combo-menu-items-btn-danger"
                          onClick={() =>
                            handleDelete(item.combo_id, item.menu_item_id)
                          }
                          title="Xóa dòng"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer với Pagination */}
        {!loading && items.length > 0 && (
          <div className="combo-menu-items-card-foot">
            <div className="combo-menu-items-meta">
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="combo-menu-items-pagination">
              <button
                type="button"
                className="combo-menu-items-btn"
                disabled={page <= 1 || loading || refreshing}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="combo-menu-items-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="combo-menu-items-btn"
                disabled={page >= totalPages || loading || refreshing}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
