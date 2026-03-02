import { headers } from 'next/headers'
import { BlogCard, Pagination, type BlogsResponse } from './components'

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
  // ✅ Next mới: searchParams là Promise
  searchParams?: Promise<{ page?: string; q?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const page = sp.page ?? '1'
  const q = sp.q ?? ''

  const blogs = await getBlogs({ page, q })

  return (
    <main className="container py-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Blogs</h1>
          <p className="text-muted mb-0">Bài viết mới nhất từ nhà hàng</p>
        </div>

        <form className="d-flex gap-2" action="/blogs" method="GET">
          <input
            className="form-control"
            name="q"
            placeholder="Tìm kiếm tiêu đề..."
            defaultValue={q}
          />
          <button className="btn btn-dark" type="submit">
            Tìm
          </button>
        </form>
      </div>

      {blogs.data.length === 0 ? (
        <div className="alert alert-secondary">Chưa có bài viết.</div>
      ) : (
        <div className="row g-3">
          {blogs.data.map((b) => (
            <div key={b.id} className="col-12 col-md-6 col-lg-4">
              <BlogCard blog={b} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={blogs.page} totalPages={blogs.totalPages} q={q} />
      </div>
    </main>
  )
}
