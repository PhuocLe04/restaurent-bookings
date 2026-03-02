import Link from 'next/link'

export default function HeroSection() {
  return (
    <section id="hero" className="hero section dark-background">
      <img src="/img/hero-bg.jpg" alt="" />

      <div className="container">
        <div className="row">
          <div className="col-lg-8 d-flex flex-column align-items-center align-items-lg-start">
            <h2>
              Welcome to <span>Restaurantly</span>
            </h2>
            <p>Delivering great food for more than 8 years!</p>

            <div className="d-flex mt-4">
              <a href="#menu" className="cta-btn">
                Our Menu
              </a>
              <Link href="/table/create" className="cta-btn">
                Book a Table
              </Link>
            </div>
          </div>

          <div className="col-lg-4 d-flex align-items-center justify-content-center mt-5 mt-lg-0">
            <a
              href="https://www.youtube.com/watch?v=teEwaAgehvY"
              className="pulsating-play-btn"
              aria-label="Play video"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
