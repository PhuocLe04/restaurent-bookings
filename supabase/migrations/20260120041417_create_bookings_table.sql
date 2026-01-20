/*
  # Create bookings table

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key) - Unique identifier for each booking
      - `name` (text) - Customer's full name
      - `email` (text) - Customer's email address
      - `phone` (text) - Customer's phone number
      - `date` (text) - Booking date
      - `time` (text) - Booking time
      - `guests` (integer) - Number of guests
      - `message` (text, optional) - Special requests or notes
      - `created_at` (timestamptz) - Timestamp when booking was created

  2. Security
    - Enable RLS on `bookings` table
    - Add policy for public to insert bookings (anyone can make a reservation)
    - Add policy for authenticated users to view all bookings (for admin/staff)
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  guests integer NOT NULL DEFAULT 2,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings"
  ON bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true);