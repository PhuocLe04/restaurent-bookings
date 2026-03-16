'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import './index.css'

type PaymentRow = {
  id: number
  reservation_id: number
  user_id: number
  amount: number | string
  payment_method: string
  purpose: string
  status: string
  order_id: string
  request_id: string
  partner_transaction_id?: string | null
  gateway_response?: string | null
  created_at?: string | null
  paid_at?: string | null
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
  reservations?: {
    id: number
    reservation_time: string
    reservation_endtime: string
    number_of_guests: number
    status: string
  } | null
}

type ListResponse = {
  items: PaymentRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

function money(value: number | string | null | undefined) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0 ₫'
  return `${n.toLocaleString('vi-VN')} ₫`
}

function formatDate(value?: string | null) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN')
}

function statusClass(status: string) {
  const s = (status || '').toUpperCase()
  if (s === 'SUCCESS') return 'payment-badge payment-badge-SUCCESS'
  if (s === 'PENDING') return 'payment-badge payment-badge-PENDING'
  if (s === 'FAILED') return 'payment-badge payment-badge-FAILED'
  if (s === 'CANCELLED') return 'payment-badge payment-badge-CANCELLED'
  return 'payment-badge'
}

function purposeClass(purpose: string) {
  const p = (purpose || '').toUpperCase()
  if (p === 'DEPOSIT') return 'payment-chip payment-chip-DEPOSIT'
  if (p === 'FINAL') return 'payment-chip payment-chip-FINAL'
  if (p === 'REFUND') return 'payment-chip payment-chip-REFUND'
  return 'payment-chip'
}

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [purpose, setPurpose] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const [page, setPage] = useState(1)
  const limit = 5
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (keyword.trim()) params.set('keyword', keyword.trim())
    if (status) params.set('status', status)
    if (purpose) params.set('purpose', purpose)
    if (paymentMethod) params.set('payment_method', paymentMethod)

    return params.toString()
  }, [page, keyword, status, purpose, paymentMethod])

  async function fetchPayments(showLoading = true) {
    try {
      setError('')
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const res = await fetch(`/admin/api/payment?${queryString}`, {
        cache: 'no-store',
      })

      const data: ListResponse = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải danh sách thanh toán')
      }

      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(Number(data.total || 0))
      setTotalPages(Number(data.totalPages || 1))
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi khi tải danh sách thanh toán')
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPayments(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  async function handleDelete(id: number) {
    const ok = window.confirm(`Bạn có chắc muốn xoá payment #${id} không?`)
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/payment/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Xoá payment thất bại')
      }

      await fetchPayments(false)
    } catch (err: any) {
      alert(err?.message || 'Xoá payment thất bại')
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchPayments(true)
  }

  function handleResetFilter() {
    setKeyword('')
    setStatus('')
    setPurpose('')
    setPaymentMethod('')
    setPage(1)
  }

  return (
    <div className="payment-page">
      <div className="payment-head">
        <div>
          <div className="payment-title">Quản lý thanh toán</div>
        </div>

        <div className="payment-head-actions">
          <button
            className="payment-btn"
            onClick={() => fetchPayments(false)}
            disabled={refreshing}
          >
            {refreshing ? 'Đang làm mới...' : 'Làm mới'}
          </button>

          <Link
            href="/admin/payments/create"
            className="payment-btn payment-btn-primary"
          >
            + Thêm thanh toán
          </Link>
        </div>
      </div>

      <div className="payment-card">
        <form className="payment-filters" onSubmit={handleSearchSubmit}>
          <div className="payment-filters-row payment-filters-row-top">
            <div className="payment-field payment-field-grow">
              <label>Tìm kiếm</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên khách, email..."
              />
            </div>

            <div className="payment-field">
              <label>Trạng thái</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="payment-field">
              <label>Mục đích</label>
              <select
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="DEPOSIT">DEPOSIT</option>
                <option value="FINAL">FINAL</option>
                <option value="REFUND">REFUND</option>
              </select>
            </div>

            <div className="payment-field">
              <label>Phương thức</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="CASH">CASH</option>
                <option value="MOMO">MOMO</option>
              </select>
            </div>
          </div>

          <div className="payment-filters-row payment-filters-row-bottom">
            <div className="payment-filter-actions">
              <button type="submit" className="payment-btn payment-btn-primary">
                Tìm kiếm
              </button>
              <button
                type="button"
                className="payment-btn"
                onClick={handleResetFilter}
              >
                Đặt lại
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="payment-card">
        <div className="payment-bottom-bar">
          <div className="payment-total">
            Tổng số payment: <strong>{total}</strong>
          </div>

          <div className="payment-pagination">
            <button
              className="payment-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>

            <span className="payment-page-indicator">
              Trang {page} / {totalPages}
            </span>

            <button
              className="payment-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="payment-card">
        {error ? (
          <div className="payment-alert">
            <div className="payment-alert-title">Có lỗi xảy ra</div>
            <div className="payment-alert-msg">{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="payment-empty">Đang tải danh sách thanh toán...</div>
        ) : items.length === 0 ? (
          <div className="payment-empty">Không có payment nào</div>
        ) : (
          <div className="payment-table-wrap">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Khách hàng</th>
                  <th>Đặt bàn</th>
                  <th>Số tiền</th>
                  <th>Phương thức</th>
                  <th>Mục đích</th>
                  <th>Trạng thái</th>
                  <th>Mã đơn</th>
                  <th>Thời gian</th>
                  {/* <th>Thao tác</th> */}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="payment-cell">
                        <div className="payment-strong">#{item.id}</div>
                      </div>
                    </td>

                    <td>
                      <div className="payment-cell">
                        <div className="payment-strong">
                          {item.users?.full_name || `User #${item.user_id}`}
                        </div>
                        <div className="payment-muted-sm">
                          {item.users?.email || '--'}
                        </div>
                        <div className="payment-muted-sm">
                          {item.users?.phone || '--'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="payment-cell">
                        <div className="payment-strong">
                          Reservation #{item.reservation_id}
                        </div>
                        <div className="payment-muted-sm">
                          {item.reservations?.reservation_time
                            ? formatDate(item.reservations.reservation_time)
                            : '--'}
                        </div>
                        <div className="payment-muted-sm">
                          Khách: {item.reservations?.number_of_guests ?? '--'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="payment-cell">
                        <div className="payment-strong">
                          {money(item.amount)}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="payment-method">
                        {item.payment_method || '--'}
                      </span>
                    </td>

                    <td>
                      <span className={purposeClass(item.purpose)}>
                        {item.purpose || '--'}
                      </span>
                    </td>

                    <td>
                      <span className={statusClass(item.status)}>
                        {item.status || '--'}
                      </span>
                    </td>

                    <td>
                      <div className="payment-cell">
                        <div className="payment-strong">
                          {item.order_id || '--'}
                        </div>
                        <div className="payment-muted-sm">
                          Req: {item.request_id || '--'}
                        </div>
                        <div className="payment-muted-sm">
                          PTID: {item.partner_transaction_id || '--'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="payment-cell">
                        <div className="payment-muted-sm">
                          Tạo: {formatDate(item.created_at)}
                        </div>
                        <div className="payment-muted-sm">
                          Paid: {formatDate(item.paid_at)}
                        </div>
                      </div>
                    </td>

                    {/* <td>
                      <div className="payment-actions-row">
                        <Link
                          href={`/admin/payments/${item.id}`}
                          className="payment-link"
                        >
                          Chi tiết
                        </Link>

                        <button
                          className="payment-link payment-link-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          Xoá
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
