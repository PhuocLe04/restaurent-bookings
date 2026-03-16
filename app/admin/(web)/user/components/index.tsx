'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import Link from 'next/link'

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

// ✅ ref type để page gọi refresh()
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
  const [membershipFilter, setMembershipFilter] = useState<number | ''>('') // ✅ membership_id
  const [memberships, setMemberships] = useState<Membership[]>([]) // ✅ danh sách hạng thành viên

  const [search, setSearch] = useState('')
  const limit = 20

  async function loadMemberships() {
    // API bạn đang dùng ở trang create
    const res = await fetch('/admin/api/membership', { cache: 'no-store' })
    const json = await res.json().catch(() => null)
    if (!res.ok)
      throw new Error(json?.message ?? 'Tải danh sách hạng thành viên thất bại')

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

      // ✅ lọc theo hạng thành viên (gửi lên membership_id)
      if (membershipFilter !== '') {
        params.set('membership_id', String(membershipFilter))
      }

      // ✅ search theo họ tên (FE); route vẫn nhận search
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/admin/api/user?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => null)) as ListResponse | null
      if (!res.ok)
        throw new Error((data as any)?.message ?? `HTTP ${res.status}`)

      setUsers(data?.items ?? [])
      setTotal(data?.total ?? 0)
      setTotalPages(data?.totalPages ?? 1)
    } catch (e: any) {
      setError(String(e?.message ?? e))
      setUsers([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ✅ tải memberships một lần
  useEffect(() => {
    ;(async () => {
      try {
        await loadMemberships()
      } catch (e: any) {
        // không chặn page nếu membership api lỗi
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, membershipFilter, search])

  // ✅ expose refresh() to parent
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

  const handleDelete = async (id: number) => {
    const ok = confirm(`Xóa người dùng #${id}?`)
    if (!ok) return
    try {
      const res = await fetch(`/admin/api/user/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message ?? 'Xóa thất bại')
      await load({ silent: true })
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
  }

  // helper: hiển thị tên hạng thành viên kể cả khi API không include membership object
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

  return (
    <div className="user-page">
      {/* Bộ lọc */}
      <div className="user-filters">
        <div className="user-field">
          <label>Vai trò</label>
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1)
              setRoleFilter(e.target.value)
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Quản trị</option>
          </select>
        </div>

        {/* ✅ Lọc theo hạng thành viên */}
        <div className="user-field">
          <label>Hạng thành viên</label>
          <select
            value={membershipFilter === '' ? '' : String(membershipFilter)}
            onChange={(e) => {
              setPage(1)
              const v = e.target.value
              setMembershipFilter(v ? Number(v) : '')
            }}
          >
            <option value="">Tất cả hạng</option>
            {memberships.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="user-field">
          <label>Tìm kiếm (họ tên)</label>
          <form onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập họ tên..."
            />
          </form>
        </div>

        <div className="user-pagination">
          <button
            className="user-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </button>

          <div className="user-page-indicator">
            Trang <b>{page}</b> / {totalPages}
          </div>

          <button
            className="user-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </button>

          {refreshing && (
            <span className="user-muted-sm" style={{ marginLeft: 10 }}>
              Đang làm mới...
            </span>
          )}
        </div>
      </div>

      {error && <div className="user-alert">Lỗi: {error}</div>}

      <div className="user-card">
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>ID</th>
                <th style={{ width: 150 }}>Người dùng</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th style={{ width: 150 }}>Vai trò</th>
                <th style={{ width: 150 }}>Hạng thành viên</th>
                <th>Điểm</th>
                <th>Ngày tạo</th>
                <th style={{ width: 200 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="user-td-muted user-loading-shimmer"
                  >
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="user-td-muted">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-id-badge">#{u.id}</div>
                    </td>
                    <td>
                      <div className="user-info-combined">
                        <div className="user-name-details">
                          <span className="user-fullname">{u.full_name}</span>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`user-badge user-badge-${u.role}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      {membershipNameOf(u) !== '—' ? (
                        <span className="user-badge user-badge-membership">
                          {membershipNameOf(u)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className="user-points">
                        {Number(u.member_point ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="user-muted-sm">
                      {formatDate(u.created_at)}
                    </td>
                    <td>
                      <div className="user-actions-row">
                        <Link href={`/admin/user/${u.id}`} className="user-btn">
                          Chi tiết
                        </Link>
                        <button
                          className="user-btn user-danger"
                          onClick={() => handleDelete(u.id)}
                          disabled={u.role === 'admin'}
                          title={
                            u.role === 'admin'
                              ? 'Không thể xóa quản trị viên'
                              : ''
                          }
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

        {!loading && users.length > 0 && (
          <div className="user-card-foot">
            <div className="user-meta">
              <span>Tổng cộng {total} người dùng</span>
              <span className="user-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default UserList
