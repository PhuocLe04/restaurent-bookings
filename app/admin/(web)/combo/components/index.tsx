'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

type Combo = {
  id: number
  title: string
  description: string | null
  total_origin_price: number | string
  sale_price: number | string
  discount_percent: number | string | null
  is_active: boolean
}

export default function ComboIndex() {
  const [items, setItems] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  async function loadData(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const url = keyword
        ? `/admin/api/combo?q=${encodeURIComponent(keyword)}`
        : '/admin/api/combo'

      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách')

      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message || 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xóa combo này?')) return
    try {
      const res = await fetch(`/admin/api/combo/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xóa thất bại')
      await loadData(true)
    } catch (e: any) {
      alert(e.message || 'Xóa thất bại')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setKeyword(q)
  }

  useEffect(() => {
    loadData()
  }, [keyword])

  const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString('vi-VN')
  }

  return (
    <div className="combo-page">
      {/* Header */}
      <div className="combo-head">
        <div>
          <h1 className="admin-title">Quản lý combo</h1>
        </div>

        <div className="combo-head-actions">
          <Link
            href="/admin/combo/create"
            className="combo-btn combo-btn-primary"
          >
            + Thêm combo
          </Link>
          <button
            type="button"
            className="combo-btn combo-btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? 'combo-refresh-icon' : ''}></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="combo-toolbar">
        <form className="combo-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo tiêu đề combo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="combo-btn combo-btn-primary">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && <div className="combo-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="combo-card">
        <div className="combo-table-wrap">
          <table className="combo-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th style={{ width: 250 }}>Tiêu đề</th>
                <th style={{ width: 120 }}>Giá gốc</th>
                <th style={{ width: 120 }}>Giá bán</th>
                <th style={{ width: 80 }}>Giảm giá</th>
                <th style={{ width: 100 }}>Trạng thái</th>
                <th style={{ width: 200 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="combo-td-muted combo-loading-shimmer"
                  >
                    Đang tải danh sách combo...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="combo-td-muted">
                    Không có dữ liệu combo
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="combo-strong">#{item.id}</span>
                    </td>
                    <td>
                      <div className="combo-info">
                        <div className="combo-details">
                          <span className="combo-title" title={item.title}>
                            {item.title}
                          </span>
                          {item.description && (
                            <span
                              className="combo-description"
                              title={item.description}
                            >
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="combo-price">
                        {formatCurrency(item.total_origin_price)}đ
                      </span>
                    </td>
                    <td>
                      <span className="combo-price">
                        {formatCurrency(item.sale_price)}đ
                      </span>
                    </td>
                    <td>
                      <span className="combo-discount">
                        {item.discount_percent ?? 0}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={`combo-badge ${item.is_active ? 'combo-badge-active' : 'combo-badge-inactive'}`}
                      >
                        {item.is_active ? 'Hoạt động' : 'Ngưng'}
                      </span>
                    </td>
                    <td>
                      <div className="combo-actions-row">
                        <Link
                          href={`/admin/combo/${item.id}`}
                          className="combo-btn"
                          title="Xem chi tiết"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="combo-btn combo-btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa combo"
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
      </div>
    </div>
  )
}
