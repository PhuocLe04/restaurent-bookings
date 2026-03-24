'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
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

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  loading?: boolean
  key: number
}

export default function ComboIndex() {
  const [items, setItems] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Combo | null>(null)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  function showToast(
    type: MessageType,
    title: string,
    message: string,
    loading = false,
  ) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      loading,
      key: prev.key + 1,
    }))
  }

  function closeToast() {
    setToast((prev) => ({
      ...prev,
      visible: false,
      loading: false,
    }))
  }

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
      showToast('error', 'Lỗi tải dữ liệu', e.message || 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function openDeletePopup(item: Combo) {
    setSelectedItem(item)
    setDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedItem) return

    try {
      setDeleting(true)

      const res = await fetch(`/admin/api/combo/${selectedItem.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Xóa thất bại')

      showToast(
        'success',
        'Xóa combo thành công',
        data.message || `Đã xóa combo "${selectedItem.title}"`,
      )

      setDeleteOpen(false)
      setSelectedItem(null)
      await loadData(true)
    } catch (e: any) {
      showToast('error', 'Xóa thất bại', e.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setKeyword(q)
  }

  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }

  useEffect(() => {
    loadData()
  }, [keyword])

  const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString('vi-VN')
  }

  return (
    <div className="combo-page">
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        toastKey={toast.key}
        loading={toast.loading}
      />

      <DeleteConfirmModal
        open={deleteOpen}
        loading={deleting}
        title="Xác nhận xóa combo"
        message="Bạn có chắc muốn xóa combo này không? Hành động này không thể hoàn tác."
        itemName={selectedItem?.title}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false)
            setSelectedItem(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

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
            onClick={handleRefreshPage}
            disabled={refreshing}
          >
            <span className={refreshing ? 'combo-refresh-icon' : ''}></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

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

      {error && <div className="combo-alert">⚠️ {error}</div>}

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
                items.map((item) => (
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
                        className={`combo-badge ${
                          item.is_active
                            ? 'combo-badge-active'
                            : 'combo-badge-inactive'
                        }`}
                      >
                        {item.is_active ? 'Hoạt động' : 'Ngưng hoạt động'}
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
                          onClick={() => openDeletePopup(item)}
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
