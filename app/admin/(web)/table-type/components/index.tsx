'use client'

import { useEffect, useState } from 'react'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type TableTypeRow = {
  id: number
  name: string
  description?: string | null
  _count?: {
    restaurant_tables: number
  }
}

type ListResponse = {
  items: TableTypeRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type DetailResponse = {
  item: TableTypeRow
  message?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
  loading?: boolean
}

type FormMode = 'create' | 'detail'

export default function TableTypePage() {
  const [items, setItems] = useState<TableTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<TableTypeRow | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<FormMode>('create')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  function showToast(
    type: MessageType,
    message: string,
    title?: string,
    loading = false,
  ) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
      loading,
    }))
  }

  async function fetchData(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (keyword.trim()) params.set('q', keyword.trim())

      const res = await fetch(`/admin/api/table-type?${params.toString()}`, {
        cache: 'no-store',
      })
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách loại bàn')
      }

      setItems(json.items || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
    } catch (e: any) {
      const msg = e?.message || 'Đã xảy ra lỗi'
      setError(msg)
      setItems([])
      setTotal(0)
      setTotalPages(1)
      showToast('error', msg, 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q)
  }

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setEditingId(null)
  }

  function openCreateModal() {
    resetForm()
    setModalMode('create')
    setModalOpen(true)
  }

  async function openDetailModal(item: TableTypeRow) {
    try {
      setModalMode('detail')
      setModalOpen(true)
      setDetailLoading(true)
      setEditingId(item.id)
      setFormName('')
      setFormDescription('')

      const res = await fetch(`/admin/api/table-type/${item.id}`, {
        cache: 'no-store',
      })
      const json: DetailResponse = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể tải chi tiết loại bàn')
      }

      setFormName(json.item?.name || '')
      setFormDescription(json.item?.description || '')
    } catch (e: any) {
      const msg = e?.message || 'Không thể tải chi tiết loại bàn'
      setError(msg)
      setModalOpen(false)
      showToast('error', msg, 'Lỗi tải chi tiết')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeModal() {
    if (saving || detailLoading) return
    setModalOpen(false)
    resetForm()
  }

  function openDeletePopup(item: TableTypeRow) {
    setSelectedItem(item)
    setDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedItem || deleting) return

    try {
      setDeleting(true)
      setDeleteOpen(false)
      setError('')
      showToast('info', 'Đang xóa loại bàn', 'Vui lòng chờ', true)

      const res = await fetch(`/admin/api/table-type/${selectedItem.id}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || 'Xóa loại bàn thất bại')
      }

      showToast(
        'success',
        json?.message || 'Xóa loại bàn thành công',
        'Thành công',
      )

      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1)
      } else {
        await fetchData(true)
      }

      setSelectedItem(null)
    } catch (e: any) {
      const msg = e?.message || 'Đã xảy ra lỗi'
      setError(msg)
      showToast('error', msg, 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const name = formName.trim()
    const description = formDescription.trim()

    if (!name) {
      showToast('warning', 'Tên loại bàn là bắt buộc', 'Thiếu thông tin')
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast(
        'info',
        modalMode === 'create' ? 'Đang tạo loại bàn' : 'Đang cập nhật loại bàn',
        'Vui lòng chờ',
        true,
      )

      const payload = {
        name,
        description: description || null,
      }

      const res = await fetch(
        modalMode === 'create'
          ? '/admin/api/table-type'
          : `/admin/api/table-type/${editingId}`,
        {
          method: modalMode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          json?.message ||
            (modalMode === 'create'
              ? 'Tạo loại bàn thất bại'
              : 'Cập nhật loại bàn thất bại'),
        )
      }

      showToast(
        'success',
        json?.message ||
          (modalMode === 'create'
            ? 'Tạo loại bàn thành công'
            : 'Cập nhật loại bàn thành công'),
        'Thành công',
      )

      setModalOpen(false)
      resetForm()
      await fetchData(true)
    } catch (e: any) {
      const msg = e?.message || 'Đã xảy ra lỗi'
      setError(msg)
      showToast('error', msg, 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        toastKey={toast.key}
        loading={toast.loading}
        autoClose={toast.loading ? 0 : 2600}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        position="top-right"
      />

      <DeleteConfirmModal
        open={deleteOpen}
        loading={deleting}
        title="Xác nhận xóa loại bàn"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa loại bàn này không?"
        itemName={selectedItem?.name || ''}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false)
            setSelectedItem(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

      {modalOpen && (
        <div className="table-type-modal-overlay" onClick={closeModal}>
          <div
            className="table-type-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="table-type-modal-head">
              <div>
                <h3 className="table-type-modal-title">
                  {modalMode === 'create'
                    ? 'Thêm loại bàn'
                    : 'Chi tiết loại bàn'}
                </h3>
                <p className="table-type-modal-subtitle">
                  {modalMode === 'create'
                    ? 'Nhập thông tin để tạo loại bàn mới.'
                    : 'Xem và chỉnh sửa thông tin loại bàn.'}
                </p>
              </div>

              <button
                type="button"
                className="table-type-modal-close"
                onClick={closeModal}
                disabled={saving || detailLoading}
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="table-type-modal-loading">
                Đang tải dữ liệu...
              </div>
            ) : (
              <form
                className="table-type-modal-form"
                onSubmit={handleSubmitForm}
              >
                <div className="table-type-modal-field">
                  <label>Tên loại bàn</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nhập tên loại bàn..."
                    disabled={saving}
                  />
                </div>

                <div className="table-type-modal-field">
                  <label>Mô tả</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Nhập mô tả loại bàn..."
                    disabled={saving}
                    rows={4}
                  />
                </div>

                <div className="table-type-modal-actions">
                  <button
                    type="button"
                    className="table-type-btn"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    className="table-type-btn table-type-btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? modalMode === 'create'
                        ? 'Đang thêm...'
                        : 'Đang lưu...'
                      : modalMode === 'create'
                        ? 'Thêm mới'
                        : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="table-type-page">
        <div className="table-type-head">
          <div>
            <h1 className="admin-title">Quản lý loại bàn</h1>
          </div>

          <div className="table-type-head-actions">
            <button
              type="button"
              className="table-type-btn table-type-btn-primary"
              onClick={openCreateModal}
            >
              + Thêm loại bàn
            </button>

            <button
              type="button"
              className="table-type-btn table-type-btn-secondary"
              onClick={handleRefreshPage}
              disabled={refreshing}
            >
              <span className={refreshing ? 'table-type-refresh-icon' : ''}>
                ↻
              </span>
              {refreshing ? ' Đang làm mới...' : ' Làm mới'}
            </button>
          </div>
        </div>

        <div className="table-type-toolbar">
          <form className="table-type-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mô tả loại bàn..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              type="submit"
              className="table-type-btn table-type-btn-primary"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {error && <div className="table-type-alert">⚠️ {error}</div>}

        <div className="table-type-card">
          <div className="table-type-table-wrap">
            <table className="table-type-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th>Tên loại bàn</th>
                  <th>Mô tả</th>
                  <th style={{ width: 130 }}>Số lượng bàn</th>
                  <th style={{ width: 200 }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="table-type-td-muted table-type-loading-shimmer"
                    >
                      Đang tải danh sách loại bàn...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-type-td-muted">
                      Không có dữ liệu loại bàn
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="table-type-strong">#{item.id}</span>
                      </td>
                      <td>
                        <div className="table-type-info">
                          <div className="table-type-details">
                            <span className="table-type-name">{item.name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.description ? (
                          <span className="table-type-description">
                            {item.description}
                          </span>
                        ) : (
                          <span className="table-type-muted-sm">—</span>
                        )}
                      </td>
                      <td>
                        <span className="table-type-count">
                          {item._count?.restaurant_tables ?? 0} Bàn
                        </span>
                      </td>
                      <td>
                        <div className="table-type-actions-row">
                          <button
                            type="button"
                            className="table-type-btn"
                            onClick={() => openDetailModal(item)}
                          >
                            Chi tiết
                          </button>

                          <button
                            type="button"
                            className="table-type-btn table-type-btn-danger"
                            onClick={() => openDeletePopup(item)}
                            disabled={deleting}
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

          {!loading && items.length > 0 && (
            <div className="table-type-card-foot">
              <div className="table-type-meta">
                <span>Tổng số {total} loại bàn</span>
                <span className="table-type-meta-dot" />
                <span>
                  Trang {page} / {totalPages}
                </span>
              </div>

              <div className="table-type-pagination">
                <button
                  type="button"
                  className="table-type-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>

                <div className="table-type-page-indicator">
                  <b>{page}</b> / {totalPages}
                </div>

                <button
                  type="button"
                  className="table-type-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
