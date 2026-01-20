import Hero from '@/components/Hero';
import BookingForm from '@/components/BookingForm';
import Features from '@/components/Features';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <BookingForm />
    </main>
  );
}
