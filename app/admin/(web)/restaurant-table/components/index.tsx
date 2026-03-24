'use client'

import { useEffect, useState } from 'react'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type RestaurantTableRow = {
  id: number
  table_name: string
  capacity: number
  is_active: boolean | null
  table_type_id: number
  table_types?: {
    id: number
    name: string
    description?: string | null
  } | null
}

type TableTypeOption = {
  id: number
  name: string
  description?: string | null
}

type ListResponse = {
  items: RestaurantTableRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type DetailResponse = {
  item: RestaurantTableRow
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

export default function RestaurantTablePage() {
  const [items, setItems] = useState<RestaurantTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [tableTypeId, setTableTypeId] = useState('')
  const [isActive, setIsActive] = useState('all')

  const [tableTypes, setTableTypes] = useState<TableTypeOption[]>([])

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
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
  const [selectedItem, setSelectedItem] = useState<RestaurantTableRow | null>(
    null,
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<FormMode>('create')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formTableName, setFormTableName] = useState('')
  const [formCapacity, setFormCapacity] = useState('')
  const [formTableTypeId, setFormTableTypeId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

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

  async function loadTableTypes() {
    try {
      const res = await fetch('/admin/api/table-type?page=1&limit=100', {
        cache: 'no-store',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) return
      setTableTypes(json?.items || [])
    } catch (e) {
      console.error(e)
    }
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
      if (tableTypeId) params.set('table_type_id', tableTypeId)
      if (isActive !== 'all') params.set('is_active', isActive)

      const res = await fetch(
        `/admin/api/restaurant-table?${params.toString()}`,
        {
          cache: 'no-store',
        },
      )
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách bàn')
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

  useEffect(() => {
    loadTableTypes()
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword, tableTypeId, isActive])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q)
  }

  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }

  function resetForm() {
    setFormTableName('')
    setFormCapacity('')
    setFormTableTypeId('')
    setFormIsActive(true)
    setEditingId(null)
  }

  function openCreateModal() {
    resetForm()
    setModalMode('create')
    setModalOpen(true)
  }

  async function openDetailModal(item: RestaurantTableRow) {
    try {
      setModalMode('detail')
      setModalOpen(true)
      setDetailLoading(true)
      setEditingId(item.id)

      const res = await fetch(`/admin/api/restaurant-table/${item.id}`, {
        cache: 'no-store',
      })
      const json: DetailResponse = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể tải chi tiết bàn')
      }

      const data = json.item
      setFormTableName(data.table_name || '')
      setFormCapacity(String(data.capacity || ''))
      setFormTableTypeId(String(data.table_type_id || ''))
      setFormIsActive(data.is_active !== false)
    } catch (e: any) {
      const msg = e?.message || 'Không thể tải chi tiết bàn'
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

  function openDeletePopup(item: RestaurantTableRow) {
    setSelectedItem(item)
    setDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedItem || deleting) return

    try {
      setDeleting(true)
      setDeleteOpen(false)
      setError('')
      showToast('info', 'Đang xóa bàn', 'Vui lòng chờ', true)

      const res = await fetch(
        `/admin/api/restaurant-table/${selectedItem.id}`,
        {
          method: 'DELETE',
        },
      )
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || 'Xóa bàn thất bại')
      }

      showToast('success', json?.message || 'Xóa bàn thành công', 'Thành công')

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

    const table_name = formTableName.trim()
    const capacity = Number(formCapacity)
    const table_type_id = Number(formTableTypeId)

    if (!table_name) {
      showToast('warning', 'Tên bàn là bắt buộc', 'Thiếu thông tin')
      return
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      showToast('warning', 'Sức chứa phải lớn hơn 0', 'Thiếu thông tin')
      return
    }

    if (!Number.isFinite(table_type_id) || table_type_id <= 0) {
      showToast('warning', 'Vui lòng chọn loại bàn', 'Thiếu thông tin')
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast(
        'info',
        modalMode === 'create' ? 'Đang tạo bàn' : 'Đang cập nhật bàn',
        'Vui lòng chờ',
        true,
      )

      const payload = {
        table_name,
        capacity,
        table_type_id,
        is_active: formIsActive,
      }

      const res = await fetch(
        modalMode === 'create'
          ? '/admin/api/restaurant-table'
          : `/admin/api/restaurant-table/${editingId}`,
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
              ? 'Tạo bàn thất bại'
              : 'Cập nhật bàn thất bại'),
        )
      }

      showToast(
        'success',
        json?.message ||
          (modalMode === 'create'
            ? 'Tạo bàn thành công'
            : 'Cập nhật bàn thành công'),
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

  const selectedType = tableTypes.find(
    (type) => String(type.id) === formTableTypeId,
  )

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
        title="Xác nhận xóa bàn"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa bàn này không?"
        itemName={selectedItem?.table_name || ''}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false)
            setSelectedItem(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

      {modalOpen && (
        <div className="restaurant-table-modal-overlay" onClick={closeModal}>
          <div
            className="restaurant-table-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="restaurant-table-modal-head">
              <div>
                <h3 className="restaurant-table-modal-title">
                  {modalMode === 'create' ? 'Thêm bàn mới' : 'Chi tiết bàn'}
                </h3>
                <p className="restaurant-table-modal-subtitle">
                  {modalMode === 'create'
                    ? 'Nhập thông tin để tạo bàn mới.'
                    : 'Xem và chỉnh sửa thông tin bàn.'}
                </p>
              </div>

              <button
                type="button"
                className="restaurant-table-modal-close"
                onClick={closeModal}
                disabled={saving || detailLoading}
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="restaurant-table-modal-loading">
                Đang tải dữ liệu...
              </div>
            ) : (
              <form
                className="restaurant-table-modal-form"
                onSubmit={handleSubmitForm}
              >
                <div className="restaurant-table-modal-grid">
                  <div className="restaurant-table-modal-field">
                    <label>Tên bàn</label>
                    <input
                      value={formTableName}
                      onChange={(e) => setFormTableName(e.target.value)}
                      placeholder="Nhập tên bàn..."
                      disabled={saving}
                    />
                  </div>

                  <div className="restaurant-table-modal-field">
                    <label>Sức chứa</label>
                    <input
                      type="number"
                      min={1}
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      placeholder="Nhập sức chứa..."
                      disabled={saving}
                    />
                  </div>

                  <div className="restaurant-table-modal-field restaurant-table-modal-field-full">
                    <label>Loại bàn</label>
                    <select
                      value={formTableTypeId}
                      onChange={(e) => setFormTableTypeId(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Chọn loại bàn</option>
                      {tableTypes.map((type) => (
                        <option key={type.id} value={String(type.id)}>
                          {type.name}
                          {type.description ? ` - ${type.description}` : ''}
                        </option>
                      ))}
                    </select>

                    {selectedType && (
                      <div className="restaurant-table-type-preview">
                        <div className="restaurant-table-type-preview-name">
                          {selectedType.name}
                        </div>
                        <div className="restaurant-table-type-preview-id">
                          {selectedType.description || 'Không có mô tả'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="restaurant-table-modal-field">
                    <label>Trạng thái</label>
                    <select
                      value={formIsActive ? 'true' : 'false'}
                      onChange={(e) =>
                        setFormIsActive(e.target.value === 'true')
                      }
                      disabled={saving}
                    >
                      <option value="true">Hoạt động</option>
                      <option value="false">Ngưng hoạt động</option>
                    </select>
                  </div>
                </div>

                <div className="restaurant-table-modal-actions">
                  <button
                    type="button"
                    className="restaurant-table-btn"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    className="restaurant-table-btn restaurant-table-btn-primary"
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

      <div className="restaurant-table-page">
        <div className="restaurant-table-head">
          <div>
            <h1 className="admin-title">Quản lý bàn nhà hàng</h1>
          </div>

          <div className="restaurant-table-head-actions">
            <button
              type="button"
              className="restaurant-table-btn restaurant-table-btn-primary"
              onClick={openCreateModal}
            >
              + Thêm bàn
            </button>

            <button
              type="button"
              className="restaurant-table-btn restaurant-table-btn-secondary"
              onClick={handleRefreshPage}
              disabled={refreshing}
            >
              <span
                className={refreshing ? 'restaurant-table-refresh-icon' : ''}
              >
                ↻
              </span>
              {refreshing ? ' Đang làm mới...' : ' Làm mới'}
            </button>
          </div>
        </div>

        <div className="restaurant-table-toolbar">
          <form className="restaurant-table-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm theo tên bàn..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              type="submit"
              className="restaurant-table-btn restaurant-table-btn-primary"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="restaurant-table-filters">
            <select
              value={tableTypeId}
              onChange={(e) => {
                setPage(1)
                setTableTypeId(e.target.value)
              }}
            >
              <option value="">Tất cả loại bàn</option>
              {tableTypes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="restaurant-table-filters">
            <select
              value={isActive}
              onChange={(e) => {
                setPage(1)
                setIsActive(e.target.value)
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Ngưng hoạt động</option>
            </select>
          </div>
        </div>

        {error && <div className="restaurant-table-alert">⚠️ {error}</div>}

        <div className="restaurant-table-card">
          <div className="restaurant-table-wrap">
            <table className="restaurant-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th>Tên bàn</th>
                  <th style={{ width: 120 }}>Sức chứa</th>
                  <th>Loại bàn</th>
                  <th style={{ width: 140 }}>Trạng thái</th>
                  <th style={{ width: 200 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="restaurant-table-td-muted restaurant-table-loading-shimmer"
                    >
                      Đang tải danh sách bàn...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="restaurant-table-td-muted">
                      Không có dữ liệu bàn
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="restaurant-table-strong">
                          #{item.id}
                        </span>
                      </td>
                      <td>
                        <div className="restaurant-table-info">
                          <div className="restaurant-table-details">
                            <span className="restaurant-table-name">
                              {item.table_name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="restaurant-table-capacity">
                          {item.capacity} Người
                        </span>
                      </td>
                      <td>
                        {item.table_types ? (
                          <div className="restaurant-table-details">
                            <span className="restaurant-table-name">
                              {item.table_types.name}
                            </span>
                            {item.table_types.description && (
                              <span className="restaurant-table-type">
                                {item.table_types.description}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="restaurant-table-muted-sm">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`restaurant-table-badge ${
                            item.is_active === false
                              ? 'restaurant-table-badge-inactive'
                              : 'restaurant-table-badge-active'
                          }`}
                        >
                          {item.is_active === false
                            ? 'Ngưng hoạt động'
                            : 'Hoạt động'}
                        </span>
                      </td>
                      <td>
                        <div className="restaurant-table-actions-row">
                          <button
                            type="button"
                            className="restaurant-table-btn"
                            onClick={() => openDetailModal(item)}
                            title="Xem chi tiết"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className="restaurant-table-btn restaurant-table-btn-danger"
                            onClick={() => openDeletePopup(item)}
                            title="Xóa bàn"
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
            <div className="restaurant-table-card-foot">
              <div className="restaurant-table-meta">
                <span>Tổng số {total} bàn</span>
                <span className="restaurant-table-meta-dot" />
                <span>
                  Trang {page} / {totalPages}
                </span>
              </div>

              <div className="restaurant-table-pagination">
                <button
                  type="button"
                  className="restaurant-table-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>

                <div className="restaurant-table-page-indicator">
                  <b>{page}</b> / {totalPages}
                </div>

                <button
                  type="button"
                  className="restaurant-table-btn"
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
