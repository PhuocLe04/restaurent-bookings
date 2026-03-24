'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  FaSearch,
  FaUtensils,
  FaConciergeBell,
  FaLayerGroup,
  FaTags,
} from 'react-icons/fa'
import './index.css'

type ServiceItem = {
  id: number
  name: string
  image: string | null
  description: string | null
  price: number | null
  is_active: boolean | null
  created_at: string | null
  _count?: {
    combo_services?: number
    reservation_services?: number
  }
}

type ComboServiceRef = {
  id?: number
  image?: string | null
  services?: {
    id?: number
    image?: string | null
    name?: string | null
  } | null
}

type ComboItem = {
  id: number
  title: string
  description: string | null
  total_origin_price: number | null
  sale_price: number | null
  discount_percent: number | null
  is_active: boolean | null
  created_at: string | null
  combo_services?: ComboServiceRef[]
  _count?: {
    combo_menu_items?: number
    combo_services?: number
  }
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type CatalogResponse = {
  services: {
    items: ServiceItem[]
    pagination: Pagination
  }
  combos: {
    items: ComboItem[]
    pagination: Pagination
  }
}

type ViewMode = 'all' | 'service' | 'combo'

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value || 0))
}

function getComboImages(item: ComboItem) {
  if (!item.combo_services?.length) return []

  return item.combo_services
    .map((svc) => ({
      src: svc?.services?.image || svc?.image || null,
      alt: svc?.services?.name || item.title,
    }))
    .filter((img): img is { src: string; alt: string } => Boolean(img.src))
}

export default function CatalogListPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  const [servicePage, setServicePage] = useState(1)
  const [comboPage, setComboPage] = useState(1)

  const [data, setData] = useState<CatalogResponse>({
    services: {
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
    combos: {
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
  })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('q', keyword.trim())
    params.set('service_page', String(servicePage))
    params.set('service_limit', '10')
    params.set('combo_page', String(comboPage))
    params.set('combo_limit', '10')
    return params.toString()
  }, [keyword, servicePage, comboPage])

  async function fetchCatalog() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/api/service-list?${queryString}`, {
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể tải danh sách catalog')
      }

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalog()
  }, [queryString])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setServicePage(1)
    setComboPage(1)
    setKeyword(q)
  }

  return (
    <section className="catalog-section">
      <div className="catalog-bg">
        <div className="bg-circle circle-1" />
        <div className="bg-circle circle-2" />
        <div className="bg-pattern" />
      </div>

      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">
            <FaLayerGroup className="subtitle-icon" />
            DỊCH VỤ & COMBO
          </span>

          <h1 className="section-title">
            Khám Phá <span className="title-highlight">Dịch Vụ</span> & Combo
          </h1>

          <div className="title-decoration">
            <span className="decoration-line"></span>
            <span className="decoration-dot"></span>
            <span className="decoration-line"></span>
          </div>
        </div>

        <form className="filter-bar" onSubmit={handleSearch}>
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm dịch vụ hoặc combo..."
              className="search-input"
            />
          </div>

          <div className="filter-row">
            <div className="segment-tabs">
              <button
                type="button"
                className={`segment-tab ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`segment-tab ${viewMode === 'service' ? 'active' : ''}`}
                onClick={() => setViewMode('service')}
              >
                Dịch vụ
              </button>
              <button
                type="button"
                className={`segment-tab ${viewMode === 'combo' ? 'active' : ''}`}
                onClick={() => setViewMode('combo')}
              >
                Combo
              </button>
            </div>

            <div className="filter-actions">
              <button type="submit" className="primary-btn">
                Tìm kiếm
              </button>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setQ('')
                  setKeyword('')
                  setViewMode('all')
                  setServicePage(1)
                  setComboPage(1)
                }}
              >
                Đặt lại
              </button>
            </div>
          </div>
        </form>

        {error ? (
          <div className="catalog-alert catalog-alert--error">{error}</div>
        ) : null}

        {(viewMode === 'all' || viewMode === 'service') && (
          <section className="catalog-block">
            <div className="catalog-block__head">
              <div>
                <span className="catalog-block__eyebrow">
                  <FaConciergeBell />
                  Dịch vụ
                </span>
                <h2 className="catalog-block__title">Danh sách dịch vụ</h2>
                <p className="catalog-block__subtitle">
                  Tổng {data.services.pagination.total} dịch vụ.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="catalog-empty">Đang tải dữ liệu...</div>
            ) : data.services.items.length === 0 ? (
              <div className="no-results">
                <FaConciergeBell className="no-results-icon" />
                <h3>Không có dịch vụ nào</h3>
                <p>Vui lòng thử lại với từ khóa khác</p>
              </div>
            ) : (
              <>
                <div className="menu-grid">
                  {data.services.items.map((item, index) => (
                    <article
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
                            <FaConciergeBell className="no-image-icon" />
                          </div>
                        )}
                      </div>

                      <div className="card-content">
                        <div className="card-header">
                          <h3 className="card-title">{item.name}</h3>
                          <div className="card-price">
                            {formatCurrency(item.price)}
                          </div>
                        </div>

                        <div className="card-category">
                          <span>Dịch vụ</span>
                        </div>

                        <p className="card-description">
                          {item.description || 'Chưa có mô tả cho dịch vụ này.'}
                        </p>

                        <div className="card-meta">
                          <span>
                            Trong combo: {item._count?.combo_services || 0}
                          </span>
                          <span>
                            Đã đặt: {item._count?.reservation_services || 0}
                          </span>
                        </div>

                        <Link
                          href={`/service-list/service/${item.id}`}
                          className="order-btn-link"
                        >
                          <button className="order-btn">Xem chi tiết</button>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="catalog-pagination">
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={servicePage <= 1}
                    onClick={() => setServicePage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>

                  <span>
                    Trang {data.services.pagination.page} /{' '}
                    {Math.max(1, data.services.pagination.totalPages || 1)}
                  </span>

                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={
                      servicePage >=
                      Math.max(1, data.services.pagination.totalPages || 1)
                    }
                    onClick={() =>
                      setServicePage((p) =>
                        Math.min(
                          Math.max(1, data.services.pagination.totalPages || 1),
                          p + 1,
                        ),
                      )
                    }
                  >
                    Trang sau
                  </button>
                </div>
              </>
            )}
          </section>
        )}
        {(viewMode === 'all' || viewMode === 'combo') && (
          <section className="catalog-block">
            <div className="catalog-block__head">
              <div>
                <span className="catalog-block__eyebrow">
                  <FaUtensils />
                  Combo
                </span>
                <h2 className="catalog-block__title">Danh sách combo</h2>
                <p className="catalog-block__subtitle">
                  Tổng {data.combos.pagination.total} combo.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="catalog-empty">Đang tải dữ liệu...</div>
            ) : data.combos.items.length === 0 ? (
              <div className="no-results">
                <FaLayerGroup className="no-results-icon" />
                <h3>Không có combo nào</h3>
                <p>Vui lòng thử lại với từ khóa khác</p>
              </div>
            ) : (
              <>
                <div className="menu-grid">
                  {data.combos.items.map((item, index) => {
                    const comboImages = getComboImages(item)

                    return (
                      <article
                        key={item.id}
                        className="menu-card combo-card"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="card-image-wrapper">
                          {comboImages.length > 0 ? (
                            <div className="combo-slider">
                              <div className="combo-slider__track">
                                {comboImages.map((img, imgIndex) => (
                                  <div
                                    key={`${item.id}-${imgIndex}`}
                                    className="combo-slider__slide"
                                  >
                                    <img
                                      src={img.src}
                                      alt={img.alt}
                                      className="card-image combo-slider__image"
                                      loading="lazy"
                                    />
                                  </div>
                                ))}
                              </div>

                              {comboImages.length > 1 && (
                                <div className="combo-slider__dots">
                                  {comboImages.map((_, dotIndex) => (
                                    <span
                                      key={`${item.id}-dot-${dotIndex}`}
                                      className="combo-slider__dot"
                                    />
                                  ))}
                                </div>
                              )}

                              {comboImages.length > 1 && (
                                <div className="combo-slider__count">
                                  {comboImages.length} ảnh
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="combo-cover">
                              <div className="combo-cover__content">
                                <FaLayerGroup className="combo-cover__icon" />
                                <span>COMBO ƯU ĐÃI</span>
                              </div>
                            </div>
                          )}

                          {Number(item.discount_percent || 0) > 0 && (
                            <div className="card-badges">
                              <span className="badge popular">
                                <FaTags />
                                <span>
                                  Giảm {Number(item.discount_percent || 0)}%
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="card-content">
                          <div className="card-header">
                            <h3 className="card-title">{item.title}</h3>
                            <div className="card-price">
                              {formatCurrency(item.sale_price)}
                            </div>
                          </div>

                          <div className="card-category">
                            <span>
                              Giá gốc: {formatCurrency(item.total_origin_price)}
                            </span>
                          </div>

                          <p className="card-description">
                            {item.description || 'Chưa có mô tả cho combo này.'}
                          </p>

                          <div className="card-meta">
                            <span>
                              Món ăn: {item._count?.combo_menu_items || 0}
                            </span>
                            <span>
                              Dịch vụ: {item._count?.combo_services || 0}
                            </span>
                            <span>
                              Giảm giá: {Number(item.discount_percent || 0)}%
                            </span>
                          </div>

                          <Link
                            href={`/service-list/combo/${item.id}`}
                            className="order-btn-link"
                          >
                            <button className="order-btn">Xem chi tiết</button>
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>

                <div className="catalog-pagination">
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={comboPage <= 1}
                    onClick={() => setComboPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>

                  <span>
                    Trang {data.combos.pagination.page} /{' '}
                    {Math.max(1, data.combos.pagination.totalPages || 1)}
                  </span>

                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={
                      comboPage >=
                      Math.max(1, data.combos.pagination.totalPages || 1)
                    }
                    onClick={() =>
                      setComboPage((p) =>
                        Math.min(
                          Math.max(1, data.combos.pagination.totalPages || 1),
                          p + 1,
                        ),
                      )
                    }
                  >
                    Trang sau
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </section>
  )
}
