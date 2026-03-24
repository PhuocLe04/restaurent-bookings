'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaConciergeBell,
  FaGift,
  FaImages,
  FaLayerGroup,
  FaListUl,
  FaRegClock,
  FaStar,
  FaTags,
  FaUtensils,
} from 'react-icons/fa'
import './page.css'

type PageProps = {
  params: Promise<{
    type: string
    id: string
  }>
}

type ServiceDetail = {
  id: number
  name: string
  image: string | null
  description: string | null
  price: number | null
  is_active: boolean | null
  duration?: number | null
  category?: {
    id: number
    name: string
  } | null
  combo_services?: Array<{
    combo_id: number
    quantity: number | null
    unit_price: number | null
    combo?: {
      id: number
      title: string
      description: string | null
      sale_price: number | null
      discount_percent: number | null
    }
  }>
}

type ComboDetail = {
  id: number
  title: string
  description: string | null
  total_origin_price: number | null
  sale_price: number | null
  discount_percent: number | null
  is_active: boolean | null
  images?: string[]
  combo_menu_items?: Array<{
    menu_item_id: number
    quantity: number | null
    unit_price: number | null
    menu_items?: {
      id: number
      name: string
      image: string | null
      price: number | null
      description?: string | null
    }
  }>
  combo_services?: Array<{
    service_id: number
    quantity: number | null
    unit_price: number | null
    services?: {
      id: number
      name: string
      image: string | null
      description: string | null
      price: number | null
      duration?: number | null
    }
  }>
}

type DetailResponse =
  | {
      type: 'service'
      item: ServiceDetail
    }
  | {
      type: 'combo'
      item: ComboDetail
    }

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value || 0))
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return '--'
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours} giờ`
  return `${hours} giờ ${remainingMinutes} phút`
}

function EmptyState({ text, icon }: { text: string; icon: React.ReactNode }) {
  return (
    <div className="detail-empty">
      <div className="detail-empty__icon">{icon}</div>
      <p>{text}</p>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={`detail-stat-card ${highlight ? 'is-highlight' : ''}`}>
      <div className="detail-stat-card__icon">{icon}</div>
      <div className="detail-stat-card__body">
        <span className="detail-stat-card__label">{label}</span>
        <strong className="detail-stat-card__value">{value}</strong>
      </div>
    </div>
  )
}

function PriceTag({
  price,
  originalPrice,
}: {
  price: number
  originalPrice?: number | null
}) {
  const hasDiscount = !!originalPrice && originalPrice > price
  const percent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  return (
    <div className="detail-price-tag">
      <span className="detail-price-tag__current">{formatCurrency(price)}</span>
      {hasDiscount && (
        <>
          <span className="detail-price-tag__original">
            {formatCurrency(originalPrice)}
          </span>
          <span className="detail-price-tag__discount">-{percent}%</span>
        </>
      )}
    </div>
  )
}

function normalizeImages(item: ComboDetail) {
  const fromImages = item.images?.filter(Boolean) || []
  const fromServices =
    item.combo_services
      ?.map((svc) => svc.services?.image)
      .filter((img): img is string => Boolean(img)) || []

  const unique = Array.from(new Set([...fromImages, ...fromServices]))
  return unique
}

export default function CustomerServiceDetailPage({ params }: PageProps) {
  const [resolved, setResolved] = useState<{ type: string; id: string } | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<DetailResponse | null>(null)

  useEffect(() => {
    params.then(setResolved)
  }, [params])

  useEffect(() => {
    if (!resolved) return

    async function fetchDetail() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch(
          `/api/service-list/detail?type=${resolved!.type}&id=${resolved!.id}`,
          { cache: 'no-store' },
        )
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json?.message || 'Không thể tải chi tiết')
        }

        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [resolved])

  if (loading || !resolved) {
    return (
      <div className="detail-page">
        <div className="detail-bg">
          <div className="bg-circle circle-1" />
          <div className="bg-circle circle-2" />
          <div className="bg-pattern" />
        </div>

        <div className="detail-container">
          <div className="detail-loading">
            <div className="detail-loading__spinner" />
            <span>Đang tải thông tin...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="detail-page">
        <div className="detail-bg">
          <div className="bg-circle circle-1" />
          <div className="bg-circle circle-2" />
          <div className="bg-pattern" />
        </div>

        <div className="detail-container">
          <div className="detail-error">
            <div className="detail-error__icon">😔</div>
            <h3>Không thể tải dữ liệu</h3>
            <p>{error || 'Không có dữ liệu'}</p>
            <Link href="/service-list" className="primary-btn">
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <div className="detail-bg">
        <div className="bg-circle circle-1" />
        <div className="bg-circle circle-2" />
        <div className="bg-pattern" />
      </div>

      <div className="detail-container">
        <Link href="/service-list" className="detail-back-link">
          <FaArrowLeft />
          <span>Quay lại danh sách</span>
        </Link>

        {data.type === 'service' ? (
          <ServiceDetailView item={data.item} />
        ) : (
          <ComboDetailView item={data.item} />
        )}
      </div>
    </div>
  )
}

function ServiceDetailView({ item }: { item: ServiceDetail }) {
  return (
    <div className="detail-layout">
      <section className="detail-hero">
        <div className="detail-hero__media">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="detail-hero__image"
            />
          ) : (
            <div className="detail-hero__placeholder">
              <FaConciergeBell />
            </div>
          )}
        </div>

        <div className="detail-hero__content">
          <div className="detail-pill-row">
            <span className="detail-pill detail-pill--accent">
              <FaConciergeBell />
              Dịch vụ
            </span>
            {item.category?.name ? (
              <span className="detail-pill">
                <FaTags />
                {item.category.name}
              </span>
            ) : null}
            <span className="detail-pill">
              <FaCheckCircle />
              Sẵn sàng phục vụ
            </span>
          </div>

          <h1 className="detail-title">{item.name}</h1>

          <p className="detail-description">
            {item.description || 'Chưa có mô tả chi tiết cho dịch vụ này.'}
          </p>

          <div className="detail-stats-grid">
            <StatCard
              icon={<FaTags />}
              label="Giá dịch vụ"
              value={formatCurrency(item.price)}
              highlight
            />
            <StatCard
              icon={<FaGift />}
              label="Có trong combo"
              value={`${item.combo_services?.length || 0} combo`}
            />
          </div>

          <div className="detail-actions">
            <Link href="/reservations" className="primary-btn large-btn">
              <FaCalendarAlt />
              Đặt dịch vụ ngay
            </Link>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="detail-section__head">
          <div>
            <span className="detail-section__eyebrow">
              <FaLayerGroup />
              Combo liên quan
            </span>
            <h2 className="detail-section__title">Combo có chứa dịch vụ này</h2>
            <p className="detail-section__subtitle">
              Chọn combo để tối ưu chi phí và trải nghiệm trọn gói hơn.
            </p>
          </div>
        </div>

        {item.combo_services && item.combo_services.length > 0 ? (
          <div className="detail-card-grid">
            {item.combo_services.map((comboService) => {
              const combo = comboService.combo
              return (
                <Link
                  key={comboService.combo_id}
                  href={`/service-list/combo/${comboService.combo_id}`}
                  className="detail-feature-card"
                >
                  <div className="detail-feature-card__top">
                    <span className="detail-mini-pill">Combo ưu đãi</span>
                    <span className="detail-feature-card__arrow">→</span>
                  </div>

                  <h3 className="detail-feature-card__title">
                    {combo?.title || `Combo #${comboService.combo_id}`}
                  </h3>

                  <p className="detail-feature-card__desc">
                    {combo?.description || 'Không có mô tả'}
                  </p>

                  <div className="detail-feature-card__meta">
                    <span>Số lượng: {comboService.quantity || 1}</span>
                    <span>
                      Đơn giá: {formatCurrency(comboService.unit_price)}
                    </span>
                  </div>

                  {combo?.sale_price ? (
                    <div className="detail-feature-card__price">
                      <PriceTag
                        price={combo.sale_price}
                        originalPrice={
                          combo.discount_percent && combo.discount_percent > 0
                            ? combo.sale_price /
                              (1 - combo.discount_percent / 100)
                            : undefined
                        }
                      />
                    </div>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<FaBoxOpen />}
            text="Hiện chưa có combo nào liên kết với dịch vụ này."
          />
        )}
      </section>
    </div>
  )
}

function ComboDetailView({ item }: { item: ComboDetail }) {
  const [activeImage, setActiveImage] = useState(0)

  const images = useMemo(() => normalizeImages(item), [item])
  const totalPrice = item.sale_price || item.total_origin_price || 0
  const originalPrice = item.total_origin_price || 0

  return (
    <div className="detail-layout">
      <section className="detail-hero detail-hero--combo">
        <div className="detail-hero__gallery">
          <div className="detail-gallery-main">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={item.title}
                className="detail-gallery-main__image"
              />
            ) : (
              <div className="detail-gallery-main__placeholder">
                <FaLayerGroup />
              </div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="detail-gallery-thumbs">
              {images.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  type="button"
                  className={`detail-gallery-thumb ${
                    activeImage === index ? 'active' : ''
                  }`}
                  onClick={() => setActiveImage(index)}
                >
                  <img src={img} alt={`${item.title} ${index + 1}`} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-hero__content">
          <div className="detail-pill-row">
            <span className="detail-pill detail-pill--accent">
              <FaGift />
              Combo ưu đãi
            </span>
            {item.discount_percent && item.discount_percent > 0 ? (
              <span className="detail-pill">
                <FaStar />
                Giảm {item.discount_percent}%
              </span>
            ) : null}
          </div>

          <h1 className="detail-title">{item.title}</h1>

          <p className="detail-description">
            {item.description || 'Combo đặc biệt với nhiều ưu đãi hấp dẫn.'}
          </p>

          <div className="detail-price-panel">
            <PriceTag price={totalPrice} originalPrice={originalPrice} />
          </div>

          <div className="detail-stats-grid">
            <StatCard
              icon={<FaUtensils />}
              label="Món ăn"
              value={`${item.combo_menu_items?.length || 0} món`}
            />
            <StatCard
              icon={<FaConciergeBell />}
              label="Dịch vụ"
              value={`${item.combo_services?.length || 0} dịch vụ`}
            />
            <StatCard
              icon={<FaTags />}
              label="Giá gốc"
              value={formatCurrency(item.total_origin_price)}
              highlight
            />
          </div>

          <div className="detail-actions">
            <Link href="/reservations" className="primary-btn large-btn">
              <FaCalendarAlt />
              Đặt combo ngay
            </Link>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="detail-section__head">
          <div>
            <span className="detail-section__eyebrow">
              <FaUtensils />
              Món ăn trong combo
            </span>
            <h2 className="detail-section__title">Danh sách món ăn</h2>
            <p className="detail-section__subtitle">
              {item.combo_menu_items?.length || 0} món ăn được chọn lọc cho
              combo này.
            </p>
          </div>
        </div>

        {item.combo_menu_items && item.combo_menu_items.length > 0 ? (
          <div className="detail-item-grid">
            {item.combo_menu_items.map((menuItem) => (
              <article key={menuItem.menu_item_id} className="detail-item-card">
                <div className="detail-item-card__media">
                  {menuItem.menu_items?.image ? (
                    <img
                      src={menuItem.menu_items.image}
                      alt={menuItem.menu_items?.name || 'Món ăn'}
                    />
                  ) : (
                    <div className="detail-item-card__placeholder">
                      <FaUtensils />
                    </div>
                  )}
                </div>

                <div className="detail-item-card__body">
                  <h3 className="detail-item-card__title">
                    {menuItem.menu_items?.name ||
                      `Món #${menuItem.menu_item_id}`}
                  </h3>
                  <p className="detail-item-card__desc">
                    {menuItem.menu_items?.description || 'Món ăn đặc sắc'}
                  </p>
                  <div className="detail-item-card__meta">
                    <span>Số lượng: {menuItem.quantity || 1}</span>
                    <span>Đơn giá: {formatCurrency(menuItem.unit_price)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FaListUl />}
            text="Combo này chưa có món ăn nào."
          />
        )}
      </section>

      <section className="detail-section">
        <div className="detail-section__head">
          <div>
            <span className="detail-section__eyebrow">
              <FaConciergeBell />
              Dịch vụ đi kèm
            </span>
            <h2 className="detail-section__title">Danh sách dịch vụ</h2>
            <p className="detail-section__subtitle">
              {item.combo_services?.length || 0} dịch vụ đi kèm trong combo.
            </p>
          </div>
        </div>

        {item.combo_services && item.combo_services.length > 0 ? (
          <div className="detail-item-grid">
            {item.combo_services.map((comboService) => (
              <article
                key={comboService.service_id}
                className="detail-item-card"
              >
                <div className="detail-item-card__media">
                  {comboService.services?.image ? (
                    <img
                      src={comboService.services.image}
                      alt={comboService.services?.name || 'Dịch vụ'}
                    />
                  ) : (
                    <div className="detail-item-card__placeholder">
                      <FaConciergeBell />
                    </div>
                  )}
                </div>

                <div className="detail-item-card__body">
                  <h3 className="detail-item-card__title">
                    {comboService.services?.name ||
                      `Dịch vụ #${comboService.service_id}`}
                  </h3>
                  <p className="detail-item-card__desc">
                    {comboService.services?.description ||
                      'Dịch vụ chăm sóc chuyên nghiệp'}
                  </p>
                  <div className="detail-item-card__meta">
                    <span>Số lượng: {comboService.quantity || 1}</span>
                    <span>
                      Đơn giá: {formatCurrency(comboService.unit_price)}
                    </span>
                    {comboService.services?.duration ? (
                      <span>
                        Thời lượng:{' '}
                        {formatDuration(comboService.services.duration)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FaConciergeBell />}
            text="Combo này chưa có dịch vụ đi kèm."
          />
        )}
      </section>
    </div>
  )
}
