import { headers } from 'next/headers'
import HeaderClient from './header'

// Server component - có thể fetch dữ liệu, cookies, headers
export default async function Header() {
  // Ví dụ: lấy thông tin từ headers hoặc cookies nếu cần
  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''
  const isMobile = userAgent.includes('Mobile')

  // Có thể fetch user data từ API ở đây nếu cần
  // const user = await getUserFromSession()

  return <HeaderClient initialIsSolid={false} />
}
