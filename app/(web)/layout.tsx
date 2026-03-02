import type { ReactNode } from 'react'
import Header from '@/app/components/header/header'
import Footer from '@/app/components/footer/footer'
import './globals.css'
import 'bootstrap/dist/css/bootstrap.min.css'
export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className="index-page">
      <Header />
      <main role="main">{children}</main>
      <Footer />
    </div>
  )
}
