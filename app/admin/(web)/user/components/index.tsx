'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type Membership = { id: number; name: string; code?: string }

type User = {
  id: number
  full_name: string
  email: string
  phone: string
  role: string
  member_point: number
  membership_id?: number
  membership?: Membership | null
  created_at: string
}

type ListResponse = {
  items: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
  loading?: boolean
}

type DeleteState = {
  open: boolean
  loading: boolean
  userId: number | null
  userName: string
}

export type UserListRef = {
  refresh: () => void
}

const UserList = forwardRef<UserListRef>(function UserList(_props, ref) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [roleFilter, setRoleFilter] = useState('')
  const [membershipFilter, setMembershipFilter] = useState<number | ''>('')
  const [memberships, setMemberships] = useState<Membership[]>([])

  const [search, setSearch] = useState('')
  const limit = 20

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const [deleteState, setDeleteState] = useState<DeleteState>({
    open: false,
    loading: false,
    userId: null,
    userName: '',
  })

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

  async function loadMemberships() {
    const res = await fetch('/admin/api/membership', { cache: 'no-store' })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message ?? 'Tải danh sách hạng thành viên thất bại')
    }

    const items: Membership[] = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json)
        ? json
        : []

    setMemberships(items)
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

      if (roleFilter) params.set('role', roleFilter)

      if (membershipFilter !== '') {
        params.set('membership_id', String(membershipFilter))
      }

      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/admin/api/user?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => null)) as ListResponse | null

      if (!res.ok) {
        throw new Error((data as any)?.message ?? `HTTP ${res.status}`)
      }

      setUsers(data?.items ?? [])
      setTotal(data?.total ?? 0)
      setTotalPages(data?.totalPages ?? 1)
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      setError(msg)
      setUsers([])
      setTotal(0)
      setTotalPages(1)
      showToast('error', msg, 'Tải danh sách thất bại')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        await loadMemberships()
      } catch (e: any) {
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, membershipFilter, search])

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => load({ silent: true }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, roleFilter, membershipFilter, search],
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const openDeletePopup = (user: User) => {
    if (user.role === 'admin') return

    setDeleteState({
      open: true,
      loading: false,
      userId: user.id,
      userName: user.full_name || `#${user.id}`,
    })
  }

  const closeDeletePopup = () => {
    if (deleteState.loading) return
    setDeleteState({
      open: false,
      loading: false,
      userId: null,
      userName: '',
    })
  }

  const confirmDelete = async () => {
    if (!deleteState.userId) return

    try {
      setDeleteState((prev) => ({ ...prev, loading: true }))
      showToast('info', 'Đang xóa người dùng', 'Vui lòng chờ', true)

      const res = await fetch(`/admin/api/user/${deleteState.userId}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Xóa thất bại')
      }

      showToast(
        'success',
        json?.message ?? 'Xóa người dùng thành công',
        'Thành công',
      )

      closeDeletePopup()
      await load({ silent: true })
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      setError(msg)
      showToast('error', msg, 'Xóa thất bại')
      setDeleteState((prev) => ({ ...prev, loading: false }))
    }
  }

  const membershipNameOf = (u: User) => {
    if (u.membership?.name) return u.membership.name
    const id = u.membership_id
    if (!id) return '—'
    return memberships.find((m) => m.id === id)?.name ?? `#${id}`
  }

  const roleLabel = (role: string) => {
    if (role === 'admin') return 'Quản trị'
    if (role === 'customer') return 'Khách hàng'
    return role
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN')
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 12,
      },
    },
  }

  const filterVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const filterItemVariants = {
    hidden: { x: -20, opacity: 0, transition: { duration: 0.2 } },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
      },
    },
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
        open={deleteState.open}
        loading={deleteState.loading}
        title="Xác nhận xóa người dùng"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa người dùng này không?"
        itemName={deleteState.userName}
        onClose={closeDeletePopup}
        onConfirm={confirmDelete}
      />

      <motion.div
        className="user-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="user-filters"
          variants={filterVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="user-field" variants={filterItemVariants}>
            <label>Vai trò</label>
            <motion.select
              value={roleFilter}
              onChange={(e) => {
                setPage(1)
                setRoleFilter(e.target.value)
              }}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="customer">Khách hàng</option>
              <option value="admin">Quản trị</option>
            </motion.select>
          </motion.div>

          <motion.div className="user-field" variants={filterItemVariants}>
            <label>Hạng thành viên</label>
            <motion.select
              value={membershipFilter === '' ? '' : String(membershipFilter)}
              onChange={(e) => {
                setPage(1)
                const v = e.target.value
                setMembershipFilter(v ? Number(v) : '')
              }}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <option value="">Tất cả hạng</option>
              {memberships.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </motion.select>
          </motion.div>

          <motion.div className="user-field" variants={filterItemVariants}>
            <label>Tìm kiếm (họ tên)</label>
            <motion.form onSubmit={handleSearch} whileHover={{ scale: 1.02 }}>
              <motion.input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nhập họ tên..."
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
            </motion.form>
          </motion.div>

          <motion.div className="user-pagination" variants={filterItemVariants}>
            <motion.button
              className="user-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Trước
            </motion.button>

            <motion.div
              className="user-page-indicator"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              Trang <b>{page}</b> / {totalPages}
            </motion.div>

            <motion.button
              className="user-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sau
            </motion.button>

            <AnimatePresence>
              {refreshing && (
                <motion.span
                  className="user-muted-sm"
                  style={{ marginLeft: 10 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  Đang làm mới...
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="user-alert animate__animated animate__shakeX"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              Lỗi: {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="user-card"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.3,
            duration: 0.5,
            type: 'spring',
            stiffness: 100,
          }}
        >
          <div className="user-table-wrap">
            <motion.table className="user-table">
              <thead>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <th style={{ width: 100 }}>ID</th>
                  <th style={{ width: 150 }}>Người dùng</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th style={{ width: 150 }}>Vai trò</th>
                  <th style={{ width: 150 }}>Hạng thành viên</th>
                  <th>Điểm</th>
                  <th>Ngày tạo</th>
                  <th style={{ width: 200 }}>Thao tác</th>
                </motion.tr>
              </thead>

              <tbody>
                {loading ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.td
                      colSpan={9}
                      className="user-td-muted user-loading-shimmer"
                    >
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        Đang tải danh sách người dùng...
                      </motion.div>
                    </motion.td>
                  </motion.tr>
                ) : users.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.td colSpan={9} className="user-td-muted">
                      Không tìm thấy người dùng nào
                    </motion.td>
                  </motion.tr>
                ) : (
                  <AnimatePresence>
                    {users.map((u) => (
                      <motion.tr
                        key={u.id}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{
                          scale: 1.01,
                          backgroundColor: 'rgba(0,0,0,0.02)',
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.td variants={itemVariants}>
                          <div className="user-id-badge animate__animated animate__fadeIn">
                            #{u.id}
                          </div>
                        </motion.td>

                        <motion.td variants={itemVariants}>
                          <div className="user-info-combined">
                            <div className="user-name-details">
                              <span className="user-fullname">
                                {u.full_name}
                              </span>
                            </div>
                          </div>
                        </motion.td>

                        <motion.td variants={itemVariants}>{u.email}</motion.td>

                        <motion.td variants={itemVariants}>
                          {u.phone || '—'}
                        </motion.td>

                        <motion.td variants={itemVariants}>
                          <motion.span
                            className={`user-badge user-badge-${u.role}`}
                            whileHover={{ scale: 1.05 }}
                          >
                            {roleLabel(u.role)}
                          </motion.span>
                        </motion.td>

                        <motion.td variants={itemVariants}>
                          {membershipNameOf(u) !== '—' ? (
                            <motion.span
                              className="user-badge user-badge-membership"
                              whileHover={{ scale: 1.05 }}
                            >
                              {membershipNameOf(u)}
                            </motion.span>
                          ) : (
                            '—'
                          )}
                        </motion.td>

                        <motion.td variants={itemVariants}>
                          <motion.span
                            className="user-points"
                            whileHover={{ scale: 1.05 }}
                          >
                            {Number(u.member_point ?? 0).toLocaleString()}
                          </motion.span>
                        </motion.td>

                        <motion.td
                          className="user-muted-sm"
                          variants={itemVariants}
                        >
                          {formatDate(u.created_at)}
                        </motion.td>

                        <motion.td variants={itemVariants}>
                          <div className="user-actions-row">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Link
                                href={`/admin/user/${u.id}`}
                                className="user-btn"
                              >
                                Chi tiết
                              </Link>
                            </motion.div>

                            <motion.button
                              className="user-btn user-danger"
                              onClick={() => openDeletePopup(u)}
                              disabled={u.role === 'admin'}
                              title={
                                u.role === 'admin'
                                  ? 'Không thể xóa quản trị viên'
                                  : ''
                              }
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Xóa
                            </motion.button>
                          </div>
                        </motion.td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </motion.table>
          </div>

          {!loading && users.length > 0 && (
            <motion.div
              className="user-card-foot"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="user-meta">
                <span>Tổng cộng {total} người dùng</span>
                <span className="user-meta-dot" />
                <span>
                  Trang {page} / {totalPages}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </>
  )
})

export default UserList
