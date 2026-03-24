'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import 'animate.css'
import './page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type Membership = {
  id: number
  name: string
  code?: string
  min_point?: number | string
  discount_percent?: number | string
}

type UserRole = 'customer' | 'admin' | string

type User = {
  id: number
  full_name: string
  email: string
  phone: string
  role: UserRole
  member_point: number
  avatar: string | null
  membership_id?: number | null
  created_at: string | null
  membership?: Membership | null
}

type Shift = {
  id: number
  start_time?: string | null
  end_time?: string | null
  status?: string | null
}

type StaffRole = 'manager' | 'staff' | 'cashier' | 'service' | string

type Staff = {
  id: number
  user_id: number
  full_name: string
  role: StaffRole
  phone: string | null
  is_active: boolean
  created_at?: string | null
  users?: User | null
  shifts?: Shift[]
}

type PatchBody = {
  full_name?: string
  role?: string
  phone?: string | null
  is_active?: boolean
  user_id?: number
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
  return (name || 'S')
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

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params?.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const [deleteOpen, setDeleteOpen] = useState(false)

  const [staff, setStaff] = useState<Staff | null>(null)

  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<StaffRole>('staff')
  const [phone, setPhone] = useState('')
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

  async function fetchStaff() {
    const res = await fetch(`/admin/api/staff/${id}`, { cache: 'no-store' })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message ?? 'Tải thông tin nhân viên thất bại')
    }

    return json?.item as Staff
  }

  async function loadData() {
    try {
      setError('')
      setLoading(true)

      const item = await fetchStaff()
      setStaff(item)

      setFullName(item.full_name ?? '')
      setRole(item.role ?? 'staff')
      setPhone(item.phone ?? '')
      setIsActive(!!item.is_active)
    } catch (e: any) {
      const msg = e?.message ?? 'Tải dữ liệu thất bại'
      setError(msg)
      setStaff(null)
      showToast('error', msg, 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const userInfo = useMemo(() => staff?.users ?? null, [staff])
  const membershipInfo = useMemo(() => userInfo?.membership ?? null, [userInfo])
  const shiftCount = useMemo(() => staff?.shifts?.length ?? 0, [staff])

  async function onSave() {
    if (!staff || saving) return

    if (!fullName.trim()) {
      const msg = 'Họ và tên nhân viên là bắt buộc.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    if (!role.trim()) {
      const msg = 'Vai trò nhân viên là bắt buộc.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast('info', 'Đang cập nhật nhân viên', 'Vui lòng chờ', true)

      const body: PatchBody = {
        full_name: fullName.trim(),
        role: role.trim(),
        phone: phone.trim() ? phone.trim() : null,
        is_active: isActive,
      }

      const res = await fetch(`/admin/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Cập nhật nhân viên thất bại')
      }

      showToast(
        'success',
        json?.message ?? 'Cập nhật nhân viên thành công',
        'Thành công',
      )

      await loadData()
      router.refresh()
    } catch (e: any) {
      const msg = e?.message ?? 'Cập nhật nhân viên thất bại'
      setError(msg)
      showToast('error', msg, 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || deleting) return

    try {
      setDeleting(true)
      setDeleteOpen(false)
      showToast('info', 'Đang xóa nhân viên', 'Vui lòng chờ', true)

      const res = await fetch(`/admin/api/staff/${id}`, {
        method: 'DELETE',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Xóa nhân viên thất bại')
      }

      showToast(
        'success',
        json?.message ?? 'Xóa nhân viên thành công',
        'Thành công',
      )

      setTimeout(() => {
        router.push('/admin/staff')
        router.refresh()
      }, 700)
    } catch (e: any) {
      const msg = e?.message ?? 'Xóa nhân viên thất bại'
      setError(msg)
      showToast('error', msg, 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.18,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
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

  const headerVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.45 },
    },
  }

  const actionsVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.45 },
    },
  }

  const avatarPanelVariants: Variants = {
    hidden: { scale: 0.96, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 180, damping: 18 },
    },
  }

  if (loading) {
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
          className="staff-detail-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="staff-detail-card">
            <div className="staff-detail-loading">
              <motion.div
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
              >
                Đang tải dữ liệu nhân viên...
              </motion.div>
            </div>
          </div>
        </motion.div>
      </>
    )
  }

  if (!staff) {
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
          className="staff-detail-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="staff-detail-head">
            <motion.div
              variants={headerVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="staff-detail-h1 animate__animated animate__fadeInUp">
                Chi tiết nhân viên
              </h1>
              <div className="staff-detail-muted">
                Không tìm thấy dữ liệu nhân viên
              </div>
            </motion.div>

            <motion.div
              className="staff-detail-head-actions"
              variants={actionsVariants}
              initial="hidden"
              animate="visible"
            >
              <Link className="staff-detail-btn" href="/admin/staff">
                ← Quay lại
              </Link>
            </motion.div>
          </div>

          <AnimatePresence>
            {(error || 'Không tìm thấy nhân viên') && (
              <motion.div
                className="staff-detail-alert animate__animated animate__shakeX"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {error || 'Không tìm thấy nhân viên'}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </>
    )
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
        title="Xác nhận xóa nhân viên"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa nhân viên này không?"
        itemName={staff.full_name || `#${staff.id}`}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={handleDelete}
      />

      <motion.div
        className="staff-detail-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="staff-detail-head">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="admin-title animate__animated animate__fadeInUp">
              Chi tiết nhân viên
            </h1>
          </motion.div>

          <motion.div
            className="staff-detail-head-actions"
            variants={actionsVariants}
            initial="hidden"
            animate="visible"
          >
            <Link className="staff-detail-btn" href="/admin/staff">
              ← Quay lại
            </Link>

            <motion.button
              className="staff-detail-btn staff-detail-btn-danger"
              onClick={() => setDeleteOpen(true)}
              disabled={saving || deleting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </motion.button>
          </motion.div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="staff-detail-alert animate__animated animate__shakeX"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              Lỗi: {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="staff-detail-card"
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.15,
            duration: 0.45,
            type: 'spring',
            stiffness: 100,
          }}
        >
          <div className="staff-detail-body">
            <motion.div
              className="staff-detail-profile"
              variants={avatarPanelVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="staff-detail-avatar-wrap">
                <div className="staff-detail-avatar">
                  {userInfo?.avatar ? (
                    <motion.img
                      src={userInfo.avatar}
                      alt={staff.full_name || 'Nhân viên'}
                      width={92}
                      height={92}
                      whileHover={{ scale: 1.08 }}
                    />
                  ) : (
                    <motion.span
                      className="staff-detail-avatar-fallback"
                      whileHover={{ scale: 1.08 }}
                    >
                      {getInitials(fullName)}
                    </motion.span>
                  )}
                </div>
              </div>

              <div className="staff-detail-profile-info">
                <div className="staff-detail-profile-name">
                  {fullName.trim() ? fullName : 'Nhân viên'}
                </div>

                <div className="staff-detail-profile-meta">
                  {userInfo?.email || 'Chưa có email'} ·{' '}
                  {phone.trim() || 'Chưa có số điện thoại'}
                </div>

                <div className="staff-detail-badge-row">
                  <span
                    className={`staff-detail-badge ${
                      isActive
                        ? 'staff-detail-badge-active'
                        : 'staff-detail-badge-inactive'
                    }`}
                  >
                    {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </span>

                  <span className="staff-detail-badge staff-detail-badge-role">
                    {roleLabel(role)}
                  </span>

                  {membershipInfo?.name && (
                    <span className="staff-detail-badge staff-detail-badge-membership">
                      {membershipInfo.name}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="staff-detail-summary"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {[
                { label: 'Vai trò staff', value: roleLabel(role) },
                {
                  label: 'User liên kết',
                  value: userInfo
                    ? `${userInfo.full_name} (#${userInfo.id})`
                    : '—',
                },
                {
                  label: 'Hạng thành viên',
                  value: membershipInfo?.name || '—',
                },
                {
                  label: 'Tổng ca làm',
                  value: String(shiftCount),
                },
                {
                  label: 'Ngày tham gia user',
                  value: fmtDateTime(userInfo?.created_at),
                },
                {
                  label: 'Điểm thành viên',
                  value: Number(userInfo?.member_point || 0).toLocaleString(
                    'vi-VN',
                  ),
                },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={itemVariants}
                  className="staff-detail-summary-item"
                >
                  <div className="staff-detail-muted-sm">{item.label}</div>
                  <div className="staff-detail-strong">{item.value}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="staff-detail-divider"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35, duration: 0.45 }}
            />

            <motion.form
              onSubmit={(e) => {
                e.preventDefault()
                onSave()
              }}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="staff-detail-section">
                <h3 className="staff-detail-section-title">
                  Thông tin nhân viên
                </h3>
                <div className="staff-detail-section-desc">
                  Chỉnh sửa thông tin chính của nhân viên trong hệ thống.
                </div>

                <div className="staff-detail-grid">
                  <motion.div
                    className="staff-detail-field"
                    variants={itemVariants}
                  >
                    <label>Họ và tên nhân viên</label>
                    <motion.input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={saving}
                      whileFocus={{ scale: 1.02 }}
                    />
                  </motion.div>

                  <motion.div
                    className="staff-detail-field"
                    variants={itemVariants}
                  >
                    <label>Vai trò nhân viên</label>
                    <motion.select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={saving}
                      whileFocus={{ scale: 1.02 }}
                    >
                      <option value="staff">Nhân viên</option>
                      <option value="manager">Quản lý</option>
                      <option value="cashier">Thu ngân</option>
                      <option value="service">Phục vụ</option>
                    </motion.select>
                  </motion.div>

                  <motion.div
                    className="staff-detail-field"
                    variants={itemVariants}
                  >
                    <label>Số điện thoại staff</label>
                    <motion.input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={saving}
                      whileFocus={{ scale: 1.02 }}
                    />
                  </motion.div>

                  <motion.div
                    className="staff-detail-field"
                    variants={itemVariants}
                  >
                    <label>Trạng thái</label>
                    <motion.select
                      value={isActive ? 'active' : 'inactive'}
                      onChange={(e) => setIsActive(e.target.value === 'active')}
                      disabled={saving}
                      whileFocus={{ scale: 1.02 }}
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </motion.select>
                  </motion.div>
                </div>
              </div>

              <div style={{ height: 16 }} />

              <motion.div
                className="staff-detail-section"
                variants={itemVariants}
              >
                <h3 className="staff-detail-section-title">
                  Thông tin user liên kết
                </h3>
                <div className="staff-detail-section-desc">
                  Dữ liệu này lấy từ bảng user mà nhân viên đang liên kết.
                </div>

                <div className="staff-detail-box">
                  <div className="staff-detail-box-grid">
                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">ID user</div>
                      <div className="staff-detail-info-value">
                        {userInfo?.id ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">Họ tên user</div>
                      <div className="staff-detail-info-value">
                        {userInfo?.full_name ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">Email</div>
                      <div className="staff-detail-info-value">
                        {userInfo?.email ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">
                        Số điện thoại
                      </div>
                      <div className="staff-detail-info-value">
                        {userInfo?.phone ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">
                        Vai trò user
                      </div>
                      <div className="staff-detail-info-value">
                        {userInfo?.role ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">
                        Điểm thành viên
                      </div>
                      <div className="staff-detail-info-value">
                        {Number(userInfo?.member_point || 0).toLocaleString(
                          'vi-VN',
                        )}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">
                        Ngày tạo user
                      </div>
                      <div className="staff-detail-info-value">
                        {fmtDateTime(userInfo?.created_at)}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">
                        Membership ID
                      </div>
                      <div className="staff-detail-info-value">
                        {userInfo?.membership_id ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div style={{ height: 16 }} />

              <motion.div
                className="staff-detail-section"
                variants={itemVariants}
              >
                <h3 className="staff-detail-section-title">
                  Thông tin membership
                </h3>
                <div className="staff-detail-section-desc">
                  Hạng thành viên hiện tại của user liên kết với staff này.
                </div>

                <div className="staff-detail-box">
                  <div className="staff-detail-box-grid">
                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">Tên hạng</div>
                      <div className="staff-detail-info-value">
                        {membershipInfo?.name ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">Mã hạng</div>
                      <div className="staff-detail-info-value">
                        {membershipInfo?.code ?? '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">
                        Điểm tối thiểu
                      </div>
                      <div className="staff-detail-info-value">
                        {membershipInfo?.min_point !== undefined &&
                        membershipInfo?.min_point !== null
                          ? String(membershipInfo.min_point)
                          : '—'}
                      </div>
                    </div>

                    <div className="staff-detail-info-line">
                      <div className="staff-detail-info-label">Ưu đãi</div>
                      <div className="staff-detail-info-value">
                        {membershipInfo?.discount_percent !== undefined &&
                        membershipInfo?.discount_percent !== null
                          ? `${membershipInfo.discount_percent}%`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="staff-detail-actions"
                variants={itemVariants}
              >
                <motion.button
                  className="staff-detail-btn staff-detail-btn-primary"
                  type="submit"
                  disabled={saving || deleting}
                  aria-busy={saving}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </motion.button>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
