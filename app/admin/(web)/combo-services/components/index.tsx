'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = {
  combo_id: number
  service_id: number
  quantity: number
  unit_price: number | string
  combo?: {
    id: number
    title: string
  } | null
  services?: {
    id: number
    name: string
  } | null
}

export default function ComboServicesIndex() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/admin/api/combo-services', {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách')
      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message || 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(comboId: number, serviceId: number) {
    if (!confirm('Bạn có chắc muốn xóa dòng này?')) return
    try {
      const res = await fetch(
        `/admin/api/combo-services/${comboId}/${serviceId}`,
        {
          method: 'DELETE',
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xóa thất bại')
      await loadData()
    } catch (e: any) {
      alert(e.message || 'Xóa thất bại')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2>Danh sách dịch vụ trong combo</h2>
        <Link href="/admin/combo-services/create">Thêm mới</Link>
      </div>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <table border={1} cellPadding={8} cellSpacing={0} width="100%">
          <thead>
            <tr>
              <th>Combo</th>
              <th>Dịch vụ</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => (
                <tr key={`${item.combo_id}-${item.service_id}`}>
                  <td>{item.combo?.title || item.combo_id}</td>
                  <td>{item.services?.name || item.service_id}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.unit_price).toLocaleString('vi-VN')}</td>
                  <td>
                    <Link
                      href={`/admin/combo-services/${item.combo_id}/${item.service_id}`}
                    >
                      Chi tiết
                    </Link>{' '}
                    |{' '}
                    <Link
                      href={`/admin/combo-services/${item.combo_id}/${item.service_id}/edit`}
                    >
                      Sửa
                    </Link>{' '}
                    |{' '}
                    <button
                      onClick={() =>
                        handleDelete(item.combo_id, item.service_id)
                      }
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Không có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
