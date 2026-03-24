import { headers } from 'next/headers'
import {
  BlogCard,
  Pagination,
  SearchForm,
  type BlogsResponse,
} from './components'
import './page.css'

export const dynamic = 'force-dynamic'

async function getBaseUrl() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host')
  return `${proto}://${host}`
}

async function getBlogs(params: { page?: string; q?: string }) {
  const sp = new URLSearchParams()
  sp.set('limit', '9')
  if (params.page) sp.set('page', params.page)
  if (params.q) sp.set('q', params.q)

  const baseUrl = await getBaseUrl()
  const res = await fetch(`${baseUrl}/api/blogs?${sp.toString()}`, {
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to load blogs')
  return (await res.json()) as BlogsResponse
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const page = sp.page ?? '1'
  const q = sp.q ?? ''

  const blogs = await getBlogs({ page, q })

  return (
    <main className="blogs-page">
      <section className="blogs-hero">
        <div className="blogs-hero-bg" />
        <div className="blogs-hero-overlay" />
        <div className="blogs-hero-noise" />

        <div className="container">
          <div className="blogs-hero-content">
            <div className="blogs-hero-badge">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
              </svg>
              <span>BÀI VIẾT ẨM THỰC</span>
            </div>

            <h1 className="blogs-hero-title">
              Bài Viết <span className="blogs-hero-title-accent">Ẩm Thực</span>
            </h1>

            <div className="blogs-hero-divider">
              <span className="blogs-hero-divider-line" />
              <span className="blogs-hero-divider-dot" />
              <span className="blogs-hero-divider-line" />
            </div>

            <p className="blogs-hero-subtitle">
              Khám phá những câu chuyện, bí quyết và cảm hứng từ thế giới ẩm
              thực, nhà hàng và trải nghiệm vị giác đầy tinh tế
            </p>
          </div>
        </div>
      </section>

      <section className="blogs-content-shell">
        <div className="container blogs-container">
          <div className="blogs-search-section">
            <SearchForm defaultValue={q} />
          </div>

          <div className="blogs-toolbar">
            <div className="blogs-toolbar-left">
              <div className="blogs-stats">
                <span className="blogs-stats-number">{blogs.total}</span>
                <span className="blogs-stats-text">bài viết</span>
              </div>

              {q && (
                <div className="blogs-search-query">
                  <span className="badge">Từ khóa: “{q}”</span>
                </div>
              )}
            </div>

            <div className="blogs-toolbar-right">
              <div className="blogs-toolbar-note">
                Cập nhật nội dung về ẩm thực
              </div>
            </div>
          </div>

          {blogs.data.length === 0 ? (
            <div className="blogs-empty">
              <i className="bi bi-emoji-frown" />
              <h3>Không tìm thấy bài viết</h3>
              <p>Thử tìm kiếm với từ khóa khác hoặc quay lại sau nhé.</p>
            </div>
          ) : (
            <div className="blogs-grid">
              {blogs.data.map((blog, index) => (
                <BlogCard key={blog.id} blog={blog} index={index} />
              ))}
            </div>
          )}

          {blogs.totalPages > 1 && (
            <div className="blogs-pagination-wrapper">
              <Pagination
                page={blogs.page}
                totalPages={blogs.totalPages}
                q={q}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
