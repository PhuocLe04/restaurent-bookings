'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, cubicBezier } from 'framer-motion'
import 'animate.css'
import '../page.css'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

type MembershipRow = {
  id: number
  code: string
  name: string
  min_point?: any
  discount_percent?: number
  created_at?: string | null
  usersCount?: number
}

type ListResponse = {
  items: MembershipRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type MembershipListRef = {
  refresh: () => void
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  loading?: boolean
  key: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: cubicBezier(0.25, 0.46, 0.45, 0.94) },
  },
}

const tableRowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: cubicBezier(0.25, 0.46, 0.45, 0.94) },
  },
}

const MembershipList = forwardRef<MembershipListRef>(
  function MembershipList(_props, ref) {
    const [items, setItems] = useState<MembershipRow[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')

    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [search, setSearch] = useState('')
    const limit = 20

    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [selectedItem, setSelectedItem] = useState<MembershipRow | null>(null)

    const [toast, setToast] = useState<ToastState>({
      visible: false,
      type: 'info',
      title: '',
      message: '',
      loading: false,
      key: 0,
    })

    const showToast = (
      type: MessageType,
      title: string,
      message: string,
      loading = false,
    ) => {
      setToast((prev) => ({
        visible: true,
        type,
        title,
        message,
        loading,
        key: prev.key + 1,
      }))
    }

    const closeToast = () => {
      setToast((prev) => ({
        ...prev,
        visible: false,
        loading: false,
      }))
    }

    const load = async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      try {
        setError('')
        if (!silent) setLoading(true)
        else setRefreshing(true)

        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(limit))
        if (search.trim()) params.set('search', search.trim())

        const res = await fetch(`/admin/api/membership?${params.toString()}`, {
          cache: 'no-store',
        })
        const json = (await res.json().catch(() => null)) as ListResponse | any

        if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`)

        setItems(json?.items ?? [])
        setTotal(json?.total ?? 0)
        setTotalPages(json?.totalPages ?? 1)
      } catch (e: any) {
        const msg = String(e?.message ?? e)
        setError(msg)
        setItems([])
        setTotal(0)
        setTotalPages(1)
        showToast('error', 'Tải dữ liệu thất bại', msg)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    useEffect(() => {
      load()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    useImperativeHandle(
      ref,
      () => ({
        refresh: () => load({ silent: true }),
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [page, search],
    )

    const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault()

      if (page !== 1) {
        setPage(1)
        return
      }

      await load()
    }

    const openDeleteModal = (item: MembershipRow) => {
      if (item.id === 1) {
        showToast(
          'warning',
          'Không thể xóa',
          'Hạng thành viên mặc định không thể bị xóa.',
        )
        return
      }
      setSelectedItem(item)
      setDeleteOpen(true)
    }

    const closeDeleteModal = () => {
      if (deleting) return
      setDeleteOpen(false)
      setSelectedItem(null)
    }

    const handleDeleteConfirm = async () => {
      if (!selectedItem) return

      try {
        setDeleting(true)

        const res = await fetch(`/admin/api/membership/${selectedItem.id}`, {
          method: 'DELETE',
        })
        const json = await res.json().catch(() => null)

        if (!res.ok) throw new Error(json?.message ?? 'Xóa thất bại')

        setDeleteOpen(false)
        setSelectedItem(null)

        await load({ silent: true })

        showToast(
          'success',
          'Xóa thành công',
          `Đã xóa hạng thành viên "${selectedItem.name}".`,
        )
      } catch (e: any) {
        showToast(
          'error',
          'Xóa thất bại',
          String((e?.message ?? e) || 'Có lỗi xảy ra khi xóa dữ liệu.'),
        )
      } finally {
        setDeleting(false)
      }
    }

    const fmtDate = (v?: string | null) => {
      if (!v) return '—'
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleDateString('vi-VN')
    }

    const fmtMinPoint = (v: any) => {
      const n = Number(v ?? 0)
      return Number.isFinite(n) ? n.toLocaleString('vi-VN') : String(v ?? 0)
    }

    return (
      <motion.div
        className="member-page"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="member-filters animate__animated animate__fadeInDown"
          variants={fadeUpVariants}
        >
          <motion.div
            className="member-field"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <label>Tìm kiếm</label>
            <form onSubmit={handleSearch}>
              <motion.input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Vd: basic, gold,..."
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              />
            </form>
          </motion.div>

          <motion.div className="member-pagination" variants={fadeUpVariants}>
            <motion.button
              className="member-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              whileHover={page > 1 && !loading ? { y: -2, scale: 1.02 } : {}}
              whileTap={page > 1 && !loading ? { scale: 0.98 } : {}}
            >
              Trước
            </motion.button>

            <motion.div
              className="member-page-indicator"
              animate={
                refreshing
                  ? {
                      opacity: [1, 0.6, 1],
                    }
                  : {
                      opacity: 1,
                    }
              }
              transition={
                refreshing
                  ? { repeat: Infinity, duration: 1.1 }
                  : { duration: 0.2 }
              }
            >
              Trang <b>{page}</b> / {totalPages}
            </motion.div>

            <motion.button
              className="member-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              whileHover={
                page < totalPages && !loading ? { y: -2, scale: 1.02 } : {}
              }
              whileTap={page < totalPages && !loading ? { scale: 0.98 } : {}}
            >
              Sau
            </motion.button>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="member-alert animate__animated animate__fadeIn"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              Lỗi: {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="member-card animate__animated animate__fadeInUp"
          variants={fadeUpVariants}
        >
          <div className="member-table-wrap">
            <table className="member-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th style={{ width: 150 }}>Code</th>
                  <th style={{ width: 150 }}>Tên hạng</th>
                  <th style={{ width: 160 }}>Điểm tối thiểu</th>
                  <th style={{ width: 140 }}>Giảm giá</th>
                  <th style={{ width: 150 }}>Số user</th>
                  <th style={{ width: 140 }}>Ngày tạo</th>
                  <th style={{ width: 220 }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="member-td-muted member-loading-shimmer"
                    >
                      <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      >
                        Đang tải danh sách...
                      </motion.div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="member-td-muted">
                      <motion.div
                        className="animate__animated animate__fadeIn"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        Không có dữ liệu
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  items.map((m, index) => {
                    const isDefault = m.id === 1

                    return (
                      <motion.tr
                        key={m.id}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.03 }}
                        whileHover={{
                          backgroundColor: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <td>#{m.id}</td>

                        <td>
                          <div className="member-strong">{m.code}</div>
                          {isDefault && (
                            <div style={{ marginTop: 6 }}>
                              <span className="member-badge member-badge-default animate__animated animate__fadeIn">
                                Mặc định
                              </span>
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="member-cell">
                            <div className="member-strong">{m.name}</div>
                          </div>
                        </td>

                        <td>{fmtMinPoint(m.min_point)}</td>

                        <td>
                          <motion.span
                            className="member-badge member-badge-discount"
                            whileHover={{ scale: 1.06 }}
                          >
                            {Number(m.discount_percent ?? 0)}%
                          </motion.span>
                        </td>

                        <td>
                          {Number(m.usersCount ?? 0).toLocaleString('vi-VN')}
                        </td>

                        <td className="member-muted-sm">
                          {fmtDate(m.created_at)}
                        </td>

                        <td>
                          <div className="member-actions-row">
                            <motion.div
                              whileHover={{ y: -2, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Link
                                className="member-btn"
                                href={`/admin/membership/${m.id}`}
                              >
                                Chi tiết
                              </Link>
                            </motion.div>

                            <motion.button
                              type="button"
                              className="member-btn member-danger"
                              onClick={() => openDeleteModal(m)}
                              disabled={isDefault}
                              title={
                                isDefault ? 'Không thể xóa hạng mặc định' : ''
                              }
                              whileHover={
                                !isDefault ? { y: -2, scale: 1.02 } : {}
                              }
                              whileTap={!isDefault ? { scale: 0.98 } : {}}
                            >
                              Xóa
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <AnimatePresence>
            {!loading && items.length > 0 && (
              <motion.div
                className="member-card-foot animate__animated animate__fadeInUp"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3 }}
              >
                <div className="member-meta">
                  <span>Tổng {total} hạng</span>
                  <span className="member-meta-dot" />
                  <span>
                    Trang {page} / {totalPages}
                  </span>
                  {refreshing && (
                    <>
                      <span className="member-meta-dot" />
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        Đang làm mới...
                      </motion.span>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <DeleteConfirmModal
          open={deleteOpen}
          title="Xác nhận xóa hạng thành viên"
          message="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa hạng thành viên này không?"
          itemName={
            selectedItem
              ? `${selectedItem.name} (${selectedItem.code})`
              : undefined
          }
          loading={deleting}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
        />

        <LiquidGlassMessage
          type={toast.type}
          title={toast.title}
          message={toast.message}
          isVisible={toast.visible}
          onClose={closeToast}
          autoClose={toast.loading ? 0 : 3500}
          position="top-right"
          toastKey={toast.key}
          loading={toast.loading}
          showIcon
          showCloseButton
          bubbleEffect
          glowEffect
          glassIntensity="medium"
        />
      </motion.div>
    )
  },
)

export default MembershipList
