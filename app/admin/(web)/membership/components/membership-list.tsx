'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import Link from 'next/link'
import '../page.css'

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
        setError(String(e?.message ?? e))
        setItems([])
        setTotal(0)
        setTotalPages(1)
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
      [page],
    )

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault()
      setPage(1)
      load()
    }

    const handleDelete = async (id: number) => {
      const ok = confirm(`Xóa hạng thành viên #${id}?`)
      if (!ok) return
      try {
        const res = await fetch(`/admin/api/membership/${id}`, {
          method: 'DELETE',
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.message ?? 'Xóa thất bại')
        await load({ silent: true })
      } catch (e: any) {
        alert(String(e?.message ?? e))
      }
    }

    const fmtDate = (v?: string | null) => {
      if (!v) return '—'
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleDateString()
    }

    const fmtMinPoint = (v: any) => {
      const n = Number(v ?? 0)
      return Number.isFinite(n) ? n.toLocaleString() : String(v ?? 0)
    }

    return (
      <div className="member-page">
        {/* Filters */}
        <div className="member-filters">
          <div className="member-field">
            <label>Tìm kiếm (tên / code)</label>
            <form onSubmit={handleSearch}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="VD: DEFAULT, GOLD, VIP..."
              />
            </form>
          </div>

          <div className="member-pagination">
            <button
              className="member-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </button>

            <div className="member-page-indicator">
              Trang <b>{page}</b> / {totalPages}
            </div>

            <button
              className="member-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>

            {refreshing && (
              <span className="member-muted-sm" style={{ marginLeft: 10 }}>
                Đang làm mới...
              </span>
            )}
          </div>
        </div>

        {error && <div className="member-alert">Lỗi: {error}</div>}

        <div className="member-card">
          <div className="member-table-wrap">
            <table className="member-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th style={{ width: 150 }}>Code</th>
                  <th>Tên hạng</th>
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
                    <td colSpan={8} className="member-td-muted">
                      Đang tải danh sách...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="member-td-muted">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  items.map((m) => {
                    const isDefault = m.id === 1
                    return (
                      <tr key={m.id}>
                        <td>#{m.id}</td>
                        <td>
                          <div className="member-strong">{m.code}</div>
                          {isDefault && (
                            <div style={{ marginTop: 6 }}>
                              <span className="member-badge member-badge-default">
                                Mặc định
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="member-cell">
                            <div className="member-strong">{m.name}</div>
                            <div className="member-muted-sm">
                              Hạng thành viên
                            </div>
                          </div>
                        </td>
                        <td>{fmtMinPoint(m.min_point)}</td>
                        <td>
                          <span className="member-badge member-badge-discount">
                            {Number(m.discount_percent ?? 0)}%
                          </span>
                        </td>
                        <td>{Number(m.usersCount ?? 0).toLocaleString()}</td>
                        <td className="member-muted-sm">
                          {fmtDate(m.created_at)}
                        </td>
                        <td>
                          <div className="member-actions-row">
                            <Link
                              className="member-btn"
                              href={`/admin/membership/${m.id}`}
                            >
                              Chi tiết
                            </Link>
                            <button
                              className="member-btn member-danger"
                              onClick={() => handleDelete(m.id)}
                              disabled={isDefault}
                              title={
                                isDefault ? 'Không thể xóa hạng mặc định' : ''
                              }
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && items.length > 0 && (
            <div className="member-card-foot">
              <div className="member-meta">
                <span>Tổng {total} hạng</span>
                <span className="member-meta-dot" />
                <span>
                  Trang {page} / {totalPages}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  },
)

export default MembershipList
