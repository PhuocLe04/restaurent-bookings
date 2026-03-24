import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import '../page.css'

export const dynamic = 'force-dynamic'

type BlogDetail = {
  id: number
  title: string
  slug: string
  content: string
  short_description: string | null
  thumbnail_url: string | null
  status: string
  published_at: string | null
  created_at: string | null
  updated_at: string | null
  author: { id: number; full_name: string; avatar: string | null } | null
}

async function getBaseUrl() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host')
  return `${proto}://${host}`
}

function fmtDate(iso?: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(new Date(iso))
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function estimateReadingTime(html: string) {
  const text = stripHtml(html)
  const words = text.split(' ').filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

async function getBlog(
  slug: string,
): Promise<
  | { ok: true; data: BlogDetail }
  | { ok: false; status: number; message: string }
> {
  const baseUrl = await getBaseUrl()
  const url = `${baseUrl}/api/blogs/${encodeURIComponent(slug)}`
  const res = await fetch(url, { cache: 'no-store' })

  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.ok) {
    return { ok: true, data: body as BlogDetail }
  }

  return {
    ok: false,
    status: res.status,
    message:
      typeof body?.message === 'string'
        ? body.message
        : `Request failed (${res.status})`,
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getBlog(slug)

  if (!result.ok) {
    if (result.status === 404) notFound()

    return (
      <main className="blogs-page blog-detail-page">
        <section className="blog-detail-error-wrap">
          <div className="container blog-detail-container">
            <div className="blog-detail-error-card">
              <p className="blog-detail-error-eyebrow">BLOG DETAIL</p>
              <h1 className="blog-detail-error-title">
                {result.status === 403
                  ? 'Bài viết chưa được xuất bản'
                  : 'Không thể tải bài viết'}
              </h1>

              <p className="blog-detail-error-text">
                {result.status === 403
                  ? 'Bài viết này hiện chưa ở trạng thái xuất bản nên chưa thể hiển thị.'
                  : `${result.message} (status ${result.status})`}
              </p>

              <Link href="/blogs" className="blog-detail-back-btn">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Quay lại danh sách bài viết
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const blog = result.data
  const readingTime = estimateReadingTime(blog.content)

  return (
    <main className="blogs-page blog-detail-page">
      <section className="blog-detail-hero-v2">
        <div
          className="blog-detail-hero-media"
          style={
            blog.thumbnail_url
              ? { backgroundImage: `url(${blog.thumbnail_url})` }
              : undefined
          }
        />
        <div className="blog-detail-hero-overlay" />
        <div className="blogs-hero-noise" />

        <div className="container blog-detail-container">
          <div className="blog-detail-hero-inner">
            <Link
              href="/blogs"
              className="blog-detail-back-btn blog-detail-back-btn-top"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Quay lại
            </Link>

            <div className="blog-detail-hero-panel">
              <div className="blog-detail-eyebrow">CHI TIẾT BÀI VIẾT</div>

              <h1 className="blog-detail-title-v2">{blog.title}</h1>

              {blog.short_description ? (
                <p className="blog-detail-subtitle-v2">
                  {blog.short_description}
                </p>
              ) : null}

              <div className="blog-detail-meta-chips">
                <div className="blog-detail-chip">
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{fmtDate(blog.published_at)}</span>
                </div>

                <div className="blog-detail-chip">
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>{blog.author?.full_name ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="blog-detail-main-v2">
        <div className="container blog-detail-container">
          <div className="blog-detail-layout">
            <article className="blog-detail-article-v2">
              <div className="blog-detail-article-head">
                <div className="blog-detail-article-line" />
                <p className="blog-detail-article-label">NỘI DUNG BÀI VIẾT</p>
              </div>

              <div
                className="blog-content blog-detail-content-v2"
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />
            </article>

            <aside className="blog-detail-sidebar">
              <div className="blog-detail-side-card">
                <p className="blog-detail-side-label">THÔNG TIN</p>

                <div className="blog-detail-side-item">
                  <span>Ngày đăng</span>
                  <strong>{fmtDate(blog.published_at) || '—'}</strong>
                </div>

                <div className="blog-detail-side-item">
                  <span>Tác giả</span>
                  <strong>{blog.author?.full_name ?? '—'}</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
