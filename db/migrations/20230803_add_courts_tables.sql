-- Tabela para gerenciamento de quadras
CREATE TABLE IF NOT EXISTS courts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  surface VARCHAR(50), -- tipo de superfície: saibro, grama sintética, etc.
  indoor BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para reservas de quadras
CREATE TABLE IF NOT EXISTS court_reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  match_id UUID,
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'CONFIRMED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relação entre partidas e quadras
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES courts(id);
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS court_reservation_id UUID REFERENCES court_reservations(id);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_court_reservations_court_id ON court_reservations(court_id);
CREATE INDEX IF NOT EXISTS idx_court_reservations_event_id ON court_reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_court_reservations_time ON court_reservations(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_court_id ON tournament_matches(court_id);
