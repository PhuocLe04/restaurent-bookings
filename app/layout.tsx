import type { Metadata } from 'next'
import './style/main.css'
import TemplateScripts from './components/template/TemplateScripts'
import TemplateInit from './components/template/TemplateInit'

export const metadata: Metadata = {
  title: 'Restaurantly',
  description: '',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/img/favicon.png" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
          rel="stylesheet"
        />

        <link rel="stylesheet" href="/vendor/bootstrap/css/bootstrap.min.css" />
        <link
          rel="stylesheet"
          href="/vendor/bootstrap-icons/bootstrap-icons.css"
        />
        <link rel="stylesheet" href="/vendor/aos/aos.css" />
        <link rel="stylesheet" href="/vendor/glightbox/css/glightbox.min.css" />
        <link rel="stylesheet" href="/vendor/swiper/swiper-bundle.min.css" />
      </head>

      <body className="index-page">
        {children}
        <TemplateScripts />
        <TemplateInit />
      </body>
    </html>
  )
}
