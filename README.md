# Restaurant Bookings

A modern restaurant booking system built with Next.js 14, React, TypeScript, Framer Motion, and Supabase.

## Features

- Modern Next.js 14 App Router architecture
- Smooth animations with Framer Motion
- TypeScript for type safety
- Tailwind CSS for styling
- Supabase for backend and database
- Responsive design
- Form validation
- Real-time booking management

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Database:** Supabase
- **Package Manager:** npm

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

You'll need to create a `bookings` table in your Supabase database with the following schema:

```sql
create table bookings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text not null,
  date text not null,
  time text not null,
  guests integer not null,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Project Structure

```
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BookingForm.tsx
│   ├── Features.tsx
│   └── Hero.tsx
├── lib/
│   └── supabase.ts
├── types/
│   └── booking.ts
└── public/
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT