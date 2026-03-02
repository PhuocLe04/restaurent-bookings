// MenuIndex.tsx
'use client'

import { useMemo, useState } from 'react'
import { FaSearch, FaUtensils, FaFire } from 'react-icons/fa'
import Link from 'next/link'
import './index.css'

type Category = { id: number; name: string }

type MenuItemDTO = {
  id: number
  name: string
  price: number
  image: string | null
  category_id: number
  description?: string
  isPopular?: boolean // Thêm trường isPopular từ dữ liệu thật
  category: {
    id: number
    name: string
  }
}

export default function MenuIndex({
  categories,
  items,
}: {
  categories: Category[]
  items: MenuItemDTO[]
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'all'>(
    'all',
  )
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    return items.filter((it) => {
      const matchCategory =
        activeCategoryId === 'all' ? true : it.category_id === activeCategoryId
      const matchText = keyword
        ? it.name.toLowerCase().includes(keyword) ||
          it.category.name.toLowerCase().includes(keyword)
        : true
      return matchCategory && matchText
    })
  }, [items, activeCategoryId, searchQuery])

  return (
    <section className="menu-section">
      {/* Background Decoration */}
      <div className="menu-bg">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-pattern"></div>
      </div>

      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <span className="section-subtitle">
            <FaUtensils className="subtitle-icon" />
            THỰC ĐƠN
          </span>
          <h2 className="section-title">
            Khám Phá <span className="title-highlight">Ẩm Thực</span>
          </h2>
          <div className="title-decoration">
            <span className="decoration-line"></span>
            <span className="decoration-dot"></span>
            <span className="decoration-line"></span>
          </div>
          <p className="section-description">
            Những món ăn tinh tế được chế biến từ nguyên liệu tươi ngon nhất
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="filter-bar">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm món ăn..."
              className="search-input"
            />
          </div>

          <div className="category-tabs">
            <button
              className={`category-tab ${activeCategoryId === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategoryId('all')}
            >
              <span>Tất cả</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`category-tab ${activeCategoryId === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryId(category.id)}
              >
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="menu-grid">
          {filtered.map((item, index) => (
            <div
              key={item.id}
              className="menu-card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="card-image-wrapper">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="card-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="no-image">
                    <FaUtensils className="no-image-icon" />
                  </div>
                )}

                {/* Popular Badge - chỉ hiển thị nếu món phổ biến */}
                {item.isPopular && (
                  <div className="card-badges">
                    <span className="badge popular">
                      <FaFire />
                      <span>Phổ biến</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="card-content">
                <div className="card-header">
                  <h3 className="card-title">{item.name}</h3>
                  <div className="card-price">{formatVND(item.price)}</div>
                </div>

                <div className="card-category">
                  <span>{item.category.name}</span>
                </div>

                {/* Order Button - full width */}
                <Link href="/reservations" className="order-btn-link">
                  <button className="order-btn">Đặt món</button>
                </Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="no-results">
              <FaUtensils className="no-results-icon" />
              <h3>Không tìm thấy món ăn</h3>
              <p>Vui lòng thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(n)
}
