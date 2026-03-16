'use client'

import Link from 'next/link'
import './page.css'

const items = [
  {
    title: 'Thống kê đặt bàn',
    description:
      'Xem danh sách đặt bàn, tỷ lệ hủy, tỷ lệ hoàn thành, giờ cao điểm, bàn dùng nhiều nhất và loại bàn phổ biến.',
    href: '/admin/analytics/reservations',
  },
  {
    title: 'Thống kê doanh thu & đơn hàng',
    description:
      'Theo dõi tổng doanh thu, AOV, doanh thu theo ngày, AOV theo ngày và top món bán chạy.',
    href: '/admin/analytics/revenue',
  },
  {
    title: 'Thống kê thanh toán & cọc',
    description:
      'Quản lý tiền cọc, thanh toán thành công/thất bại, số tiền còn lại và lịch sử giao dịch.',
    href: '/admin/analytics/payments',
  },
  {
    title: 'Thống kê dịch vụ & combo',
    description:
      'Xem top dịch vụ bán chạy, doanh thu dịch vụ và tình hình combo hiện có trong hệ thống.',
    href: '/admin/analytics/upsell',
  },
]

export default function AnalyticsIndexPage() {
  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-head">
        <div>
          <h1 className="admin-title">Thống kê hệ thống</h1>
          <p className="analytics-muted">
            Chọn một nhóm thống kê để xem dữ liệu chi tiết cho nhà hàng.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="analytics-grid">
        {items.map((item, index) => (
          <Link key={item.href} href={item.href} className="analytics-card">
            <div className="analytics-card-header">
              <span className="analytics-card-badge">Thống kê</span>
              <span className="analytics-card-arrow">→</span>
            </div>

            <h2 className="analytics-card-title">{item.title}</h2>
            <p className="analytics-card-desc">{item.description}</p>

            <div className="analytics-card-footer">
              <span className="analytics-card-link">
                Xem chi tiết
                <span>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
