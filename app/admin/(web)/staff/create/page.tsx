'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import 'animate.css'
import './page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

type Membership = {
  id: number
  name: string
  code?: string
  min_point?: number | string
  discount_percent?: number | string
}

type UserItem = {
  id: number
  full_name: string
  email: string
  phone: string | null
  role: string
  avatar?: string | null
  member_point?: number
  membership_id?: number | null
  created_at?: string | null
  membership?: Membership | null
}

type UserListResponse = {
  items?: UserItem[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
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

function getInitials(name: string) {
  return (name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function fmtDateTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN')
}

function roleLabel(role: string) {
  switch (role) {
    case 'admin':
      return 'Quản trị viên'
    case 'customer':
      return 'Khách hàng'
    case 'manager':
      return 'Quản lý'
    case 'cashier':
      return 'Thu ngân'
    case 'service':
      return 'Phục vụ'
    case 'staff':
      return 'Nhân viên'
    default:
      return role || '—'
  }
}

export default function StaffCreatePage() {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const [userKeyword, setUserKeyword] = useState('')
  const [userOptions, setUserOptions] = useState<UserItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const [role, setRole] = useState('staff')
  const [isActive, setIsActive] = useState(true)

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

  async function fetchUsers(keyword = '') {
    try {
      setLoadingUsers(true)

      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('limit', '20')
      params.set('available_only', 'true')
      if (keyword.trim()) params.set('search', keyword.trim())

      const res = await fetch(`/admin/api/user?${params.toString()}`, {
        cache: 'no-store',
      })
      const json: UserListResponse = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json.message || 'Không tải được danh sách user')
      }

      const items = Array.isArray(json.items) ? json.items : []
      setUserOptions(items)
      setHighlightedIndex(0)
    } catch (e: any) {
      const msg = e?.message || 'Tải danh sách user thất bại'
      setUserOptions([])
      setError(msg)
      showToast('error', msg, 'Lỗi tải user')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers('')
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(userKeyword)
    }, 300)

    return () => clearTimeout(timer)
  }, [userKeyword])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!dropdownRef.current) return
      if (!dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedUser = useMemo(
    () => userOptions.find((u) => u.id === selectedUserId) ?? null,
    [userOptions, selectedUserId],
  )

  const selectedUserLabel = selectedUser
    ? `${selectedUser.full_name} - #${selectedUser.id}`
    : ''

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.14,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: 18, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  }

  function handleSelectUser(user: UserItem) {
    setSelectedUserId(user.id)
    setDropdownOpen(false)
    setUserKeyword(user.full_name)
  }

  function handleDropdownKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setDropdownOpen(true)
      return
    }

    if (!userOptions.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, userOptions.length - 1))
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const picked = userOptions[highlightedIndex]
      if (picked) handleSelectUser(picked)
    }

    if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  async function onCreate() {
    if (saving) return

    if (!selectedUserId) {
      const msg = 'Vui lòng chọn user để tạo staff.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    if (!role.trim()) {
      const msg = 'Vui lòng chọn vai trò nhân viên.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast('info', 'Đang tạo nhân viên', 'Vui lòng chờ', true)

      const body = {
        user_id: selectedUserId,
        role: role.trim(),
        is_active: isActive,
      }

      const res = await fetch('/admin/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || 'Tạo nhân viên thất bại')
      }

      showToast(
        'success',
        json?.message || 'Tạo nhân viên thành công',
        'Thành công',
      )

      const newId = json?.item?.id
      setTimeout(() => {
        if (newId) router.push(`/admin/staff/${newId}`)
        else router.push('/admin/staff')
        router.refresh()
      }, 700)
    } catch (e: any) {
      const msg = e?.message || 'Tạo nhân viên thất bại'
      setError(msg)
      showToast('error', msg, 'Tạo thất bại')
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

      <motion.div
        className="staff-create-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="staff-create-head">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <h1 className="admin-title animate__animated animate__fadeInUp">
              Tạo nhân viên
            </h1>
            <div className="staff-create-muted">
              Chỉ hiển thị user chưa có trong staff. Nhập trực tiếp trong
              dropdown để tìm nhanh theo tên, email hoặc số điện thoại.
            </div>
          </motion.div>

          <motion.div
            className="staff-create-head-actions"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Link className="staff-create-btn" href="/admin/staff">
              ← Quay lại
            </Link>
          </motion.div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="staff-create-alert animate__animated animate__shakeX"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              Lỗi: {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="staff-create-card"
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <motion.div
            className="staff-create-body"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="staff-create-section"
              variants={itemVariants}
            >
              <h3 className="staff-create-section-title">Chọn user</h3>
              <div className="staff-create-section-desc">
                FE hiển thị tên user nhưng khi tạo sẽ gửi <b>user_id</b>.
              </div>

              <div className="staff-create-grid">
                <div className="staff-create-field staff-create-field-full">
                  <label>User chưa có staff</label>

                  <div className="staff-create-combobox" ref={dropdownRef}>
                    <button
                      type="button"
                      className={`staff-create-combobox-trigger ${
                        dropdownOpen ? 'is-open' : ''
                      }`}
                      onClick={() => {
                        setDropdownOpen((prev) => !prev)
                        setTimeout(() => searchInputRef.current?.focus(), 0)
                      }}
                    >
                      <div className="staff-create-combobox-trigger-text">
                        {selectedUser ? (
                          <>
                            <span className="staff-create-combobox-selected-name">
                              {selectedUser.full_name}
                            </span>
                            <span className="staff-create-combobox-selected-meta">
                              #{selectedUser.id} ·{' '}
                              {selectedUser.email || 'Không có email'}
                            </span>
                          </>
                        ) : (
                          <span className="staff-create-combobox-placeholder">
                            Chọn user để tạo staff
                          </span>
                        )}
                      </div>

                      <span
                        className={`staff-create-combobox-arrow ${
                          dropdownOpen ? 'is-open' : ''
                        }`}
                      >
                        ▾
                      </span>
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          className="staff-create-combobox-panel"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="staff-create-combobox-search">
                            <input
                              ref={searchInputRef}
                              value={userKeyword}
                              onChange={(e) => {
                                setUserKeyword(e.target.value)
                                setDropdownOpen(true)
                              }}
                              onFocus={() => setDropdownOpen(true)}
                              onKeyDown={handleDropdownKeyDown}
                              placeholder="Nhập tên, email hoặc số điện thoại..."
                              disabled={saving}
                            />
                          </div>

                          <div className="staff-create-combobox-list">
                            {loadingUsers ? (
                              <div className="staff-create-combobox-empty">
                                Đang tải user...
                              </div>
                            ) : userOptions.length === 0 ? (
                              <div className="staff-create-combobox-empty">
                                Không còn user phù hợp hoặc tất cả đã có staff.
                              </div>
                            ) : (
                              userOptions.map((user, index) => {
                                const active =
                                  highlightedIndex === index ||
                                  selectedUserId === user.id

                                return (
                                  <button
                                    key={user.id}
                                    type="button"
                                    className={`staff-create-combobox-option ${
                                      active ? 'is-active' : ''
                                    }`}
                                    onMouseEnter={() =>
                                      setHighlightedIndex(index)
                                    }
                                    onClick={() => handleSelectUser(user)}
                                  >
                                    <div className="staff-create-combobox-option-avatar">
                                      {user.avatar ? (
                                        <img
                                          src={user.avatar}
                                          alt={user.full_name}
                                        />
                                      ) : (
                                        <span>
                                          {getInitials(user.full_name)}
                                        </span>
                                      )}
                                    </div>

                                    <div className="staff-create-combobox-option-content">
                                      <div className="staff-create-combobox-option-name">
                                        {user.full_name}
                                      </div>
                                      <div className="staff-create-combobox-option-meta">
                                        #{user.id} ·{' '}
                                        {user.email || 'Không có email'}
                                      </div>
                                      <div className="staff-create-combobox-option-sub">
                                        {user.phone || 'Không có số điện thoại'}{' '}
                                        · {roleLabel(user.role)}
                                      </div>
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {selectedUserId && (
                    <div className="staff-create-selected-hint">
                      Đã chọn: <b>{selectedUserLabel}</b> → submit sẽ gửi ID:{' '}
                      <b>{selectedUserId}</b>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="staff-create-section"
              variants={itemVariants}
            >
              <h3 className="staff-create-section-title">
                Thông tin staff sẽ tạo
              </h3>
              <div className="staff-create-section-desc">
                Sau khi tạo, backend sẽ lấy dữ liệu của user để điền vào staff.
              </div>

              <div className="staff-create-grid">
                <div className="staff-create-field">
                  <label>Vai trò staff</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={saving}
                  >
                    <option value="staff">Nhân viên</option>
                    <option value="manager">Quản lý</option>
                    <option value="cashier">Thu ngân</option>
                    <option value="service">Phục vụ</option>
                  </select>
                </div>

                <div className="staff-create-field">
                  <label>Trạng thái</label>
                  <select
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    disabled={saving}
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="staff-create-section"
              variants={itemVariants}
            >
              <h3 className="staff-create-section-title">
                Thông tin user đã chọn
              </h3>
              <div className="staff-create-section-desc">
                Chọn user xong sẽ hiển thị toàn bộ thông tin để kiểm tra trước
                khi tạo staff.
              </div>

              {!selectedUser ? (
                <div className="staff-create-empty">Chưa chọn user nào.</div>
              ) : (
                <>
                  <div className="staff-create-profile">
                    <div className="staff-create-avatar-wrap">
                      <div className="staff-create-avatar">
                        {selectedUser.avatar ? (
                          <img
                            src={selectedUser.avatar}
                            alt={selectedUser.full_name}
                          />
                        ) : (
                          <span className="staff-create-avatar-fallback">
                            {getInitials(selectedUser.full_name)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="staff-create-profile-info">
                      <div className="staff-create-profile-name">
                        {selectedUser.full_name}
                      </div>
                      <div className="staff-create-profile-meta">
                        {selectedUser.email || 'Chưa có email'} ·{' '}
                        {selectedUser.phone || 'Chưa có số điện thoại'}
                      </div>

                      <div className="staff-create-badge-row">
                        <span className="staff-create-badge">
                          User ID: #{selectedUser.id}
                        </span>
                        <span className="staff-create-badge staff-create-badge-role">
                          {roleLabel(selectedUser.role)}
                        </span>
                        {selectedUser.membership?.name && (
                          <span className="staff-create-badge staff-create-badge-membership">
                            {selectedUser.membership.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="staff-create-box">
                    <div className="staff-create-box-grid">
                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">User ID</div>
                        <div className="staff-create-info-value">
                          {selectedUser.id}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">Họ tên</div>
                        <div className="staff-create-info-value">
                          {selectedUser.full_name}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">Email</div>
                        <div className="staff-create-info-value">
                          {selectedUser.email || '—'}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">
                          Số điện thoại
                        </div>
                        <div className="staff-create-info-value">
                          {selectedUser.phone || '—'}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">
                          Vai trò user
                        </div>
                        <div className="staff-create-info-value">
                          {roleLabel(selectedUser.role)}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">
                          Ngày tạo user
                        </div>
                        <div className="staff-create-info-value">
                          {fmtDateTime(selectedUser.created_at)}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">
                          Điểm thành viên
                        </div>
                        <div className="staff-create-info-value">
                          {Number(
                            selectedUser.member_point || 0,
                          ).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">
                          Membership ID
                        </div>
                        <div className="staff-create-info-value">
                          {selectedUser.membership_id ?? '—'}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">Tên hạng</div>
                        <div className="staff-create-info-value">
                          {selectedUser.membership?.name ?? '—'}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">Mã hạng</div>
                        <div className="staff-create-info-value">
                          {selectedUser.membership?.code ?? '—'}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">
                          Điểm tối thiểu
                        </div>
                        <div className="staff-create-info-value">
                          {selectedUser.membership?.min_point ?? '—'}
                        </div>
                      </div>

                      <div className="staff-create-info-line">
                        <div className="staff-create-info-label">Ưu đãi</div>
                        <div className="staff-create-info-value">
                          {selectedUser.membership?.discount_percent != null
                            ? `${selectedUser.membership.discount_percent}%`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            <motion.div
              className="staff-create-actions"
              variants={itemVariants}
            >
              <button
                className="staff-create-btn staff-create-btn-primary"
                type="button"
                onClick={onCreate}
                disabled={saving}
              >
                {saving ? 'Đang tạo...' : 'Tạo nhân viên'}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  )
}
