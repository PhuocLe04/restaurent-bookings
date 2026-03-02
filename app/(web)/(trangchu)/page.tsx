import HeroSection from './components/HeroSection/'
import AboutSection from './components/AboutSection/index'
import WhyUsSection from './components/WhyUsSection/index'
import MenuSection from './components/MenuSection/index'
import EventsSection from './components/EventsSection/index'
// import TestimonialsSection from './components/TestimonialsSection'
// import GallerySection from './components/GallerySection/index'
import ChefsSection from './components/ChefsSection/index'
import ContactSection from './components/ContactSection/index'
import './home.css'
export default function Page() {
  return (
    <main className="main">
      <HeroSection />
      <AboutSection />
      <WhyUsSection />
      <MenuSection />
      <EventsSection />
      {/* <TestimonialsSection /> */}
      {/* <GallerySection /> */}
      <ChefsSection />
      <ContactSection />
    </main>
  )
}
