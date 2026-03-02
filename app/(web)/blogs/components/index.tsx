import Link from 'next/link'

export type BlogListItem = {
  id: number
  title: string
  slug: string
  short_description: string | null
  thumbnail_url: string | null
  published_at: string | null
  author: { id: number; full_name: string; avatar: string | null } | null
}

export type BlogsResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  data: BlogListItem[]
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

export function BlogCard({ blog }: { blog: BlogListItem }) {
  return (
    <div className="card h-100 shadow-sm">
      <Link href={`/blogs/${blog.slug}`} className="text-decoration-none">
        <div
          className="ratio ratio-16x9 bg-light"
          style={{
            backgroundImage: blog.thumbnail_url
              ? `url(${blog.thumbnail_url})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </Link>

      <div className="card-body">
        <Link
          href={`/blogs/${blog.slug}`}
          className="text-decoration-none text-dark"
        >
          <h3 className="h6 mb-2">{blog.title}</h3>
        </Link>

        <p
          className="text-muted mb-3"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {blog.short_description ?? '—'}
        </p>

        <div className="d-flex align-items-center justify-content-between">
          <small className="text-muted">{fmtDate(blog.published_at)}</small>
          <small className="text-muted">{blog.author?.full_name ?? '—'}</small>
        </div>
      </div>
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  q,
}: {
  page: number
  totalPages: number
  q?: string
}) {
  if (totalPages <= 1) return null

  const mkHref = (p: number) => {
    const sp = new URLSearchParams()
    sp.set('page', String(p))
    if (q) sp.set('q', q)
    return `/blogs?${sp.toString()}`
  }

  const prev = Math.max(1, page - 1)
  const next = Math.min(totalPages, page + 1)

  return (
    <nav aria-label="Blog pagination">
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <Link
            className="page-link"
            href={mkHref(prev)}
            aria-disabled={page <= 1}
          >
            Trước
          </Link>
        </li>

        <li className="page-item disabled">
          <span className="page-link">
            {page} / {totalPages}
          </span>
        </li>

        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <Link
            className="page-link"
            href={mkHref(next)}
            aria-disabled={page >= totalPages}
          >
            Sau
          </Link>
        </li>
      </ul>
    </nav>
  )
}
