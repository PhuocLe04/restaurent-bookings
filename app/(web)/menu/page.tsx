// app/menu/page.tsx
import MenuIndex from './components'

export const dynamic = 'force-dynamic'

type Category = { id: number; name: string }

type MenuItemDTO = {
  id: number
  name: string
  price: number
  image: string | null
  category_id: number
  category: {
    id: number
    name: string
  }
}

async function getMenu() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')

  const res = await fetch(`${baseUrl}/api/menu`, {
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to fetch menu')

  return (await res.json()) as { categories: Category[]; items: MenuItemDTO[] }
}

export default async function MenuPage() {
  const data = await getMenu()
  return <MenuIndex categories={data.categories} items={data.items} />
}
