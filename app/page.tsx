// app/page.tsx
import Header from './components/header/header'
import Footer from './components/footer/footer'

export default function HomePage() {
  const isLoggedIn = false

  return (
    <>
      <Header isLoggedIn={isLoggedIn} />

      <main role="main" className="pb-3">
        <section id="hero" style={{ minHeight: 300 }}></section>
      </main>

      <Footer />
    </>
  )
}
