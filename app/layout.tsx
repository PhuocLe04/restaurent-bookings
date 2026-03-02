import type { ReactNode } from 'react'

import 'bootstrap/dist/css/bootstrap.min.css'

export const metadata = {
  title: 'Restaurantly - Premium Restaurant',
  description: 'Delivering great food for more than 8 years!',
  keywords: ['restaurant', 'food', 'dining', 'reservation'],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Favicons */}
        <link rel="icon" href="/img/favicon.png" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />

        {/* Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900&family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Icons */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"
        />
      </head>

      {/* ⛔ KHÔNG render Header/Footer ở đây nữa */}
      <body>{children}</body>
    </html>
  )
}
