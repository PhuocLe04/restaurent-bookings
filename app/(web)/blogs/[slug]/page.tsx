import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
  return iso.slice(0, 10) // ổn định SSR/CSR
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

  // parse message (nếu api trả json {message})
  let message = `Request failed (${res.status})`
  try {
    const j = await res.json()
    if (typeof j?.message === 'string') message = j.message
  } catch {
    // ignore
  }

  if (res.ok) {
    // nếu res.ok thì parse lại bằng fetch json (do ở trên đã json rồi)
    // => ta cần fetch lại? Không cần: ta đã đọc body.
    // Cách đúng: đọc body 1 lần. Nên ta sẽ fetch lại ở nhánh ok:
    const res2 = await fetch(url, { cache: 'no-store' })
    const data = (await res2.json()) as BlogDetail
    return { ok: true, data }
  }

  return { ok: false, status: res.status, message }
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

    if (result.status === 403) {
      return (
        <main className="container py-4">
          <Link href="/blogs" className="text-decoration-none">
            ← Quay lại
          </Link>
          <div className="alert alert-warning mt-3">
            Bài viết chưa được xuất bản (PUBLISHED) nên không xem được.
          </div>
        </main>
      )
    }

    return (
      <main className="container py-4">
        <Link href="/blogs" className="text-decoration-none">
          ← Quay lại
        </Link>
        <div className="alert alert-danger mt-3">
          Lỗi tải bài viết: {result.message} (status {result.status})
        </div>
      </main>
    )
  }

  const blog = result.data

  return (
    <main className="container py-4">
      <Link href="/blogs" className="text-decoration-none">
        ← Quay lại
      </Link>

      <h1 className="h3 mt-3 mb-2">{blog.title}</h1>

      {blog.short_description ? (
        <p className="text-muted mb-3">{blog.short_description}</p>
      ) : null}

      <div className="d-flex flex-wrap align-items-center gap-2 text-muted">
        <small>{fmtDate(blog.published_at)}</small>
        <span>•</span>
        <small>{blog.author?.full_name ?? '—'}</small>
      </div>

      <div className="mt-3">
        <div
          className="ratio ratio-21x9 bg-light rounded"
          style={{
            backgroundImage: blog.thumbnail_url
              ? `url(${blog.thumbnail_url})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      <article className="mt-4">
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>
    </main>
  )
}
