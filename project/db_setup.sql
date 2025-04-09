-- Note: This file should be executed in your Supabase SQL Editor

-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('TOURNAMENT', 'POOL')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  max_participants INTEGER NOT NULL,
  prize TEXT,
  rules TEXT,
  banner_image_url TEXT,
  team_formation TEXT NOT NULL CHECK (team_formation IN ('RANDOM', 'FORMED')),
  categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  partner_id UUID REFERENCES participants(id),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('PENDING', 'CONFIRMED')) DEFAULT 'PENDING',
  payment_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_email_per_event UNIQUE (event_id, email),
  -- Nova restrição: partner_id só pode ser não-nulo quando o evento for de duplas formadas
  CONSTRAINT valid_partner CHECK (
    partner_id IS NULL OR
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_id AND e.team_formation = 'FORMED'
    )
  )
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rounds INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'STARTED', 'FINISHED')),
  CONSTRAINT unique_tournament_per_event UNIQUE (event_id)
);

-- Create tournament_matches table
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  team1 TEXT[],
  team2 TEXT[],
  score1 INTEGER,
  score2 INTEGER,
  winner_id TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_match_position UNIQUE (event_id, round, position)
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id),
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'CARD', 'CASH', 'OTHER')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security but allow all actions for authenticated users
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all actions for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access to authenticated users" ON participants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access to authenticated users" ON tournaments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access to authenticated users" ON tournament_matches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access to authenticated users" ON financial_transactions FOR ALL USING (auth.role() = 'authenticated');
