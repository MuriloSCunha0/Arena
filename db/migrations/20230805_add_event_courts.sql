-- Tabela para relacionar eventos com quadras
CREATE TABLE IF NOT EXISTS event_courts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, court_id)
);

-- Índices para consultas de eventos por quadra e quadras por evento
CREATE INDEX IF NOT EXISTS idx_event_courts_event_id ON event_courts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_courts_court_id ON event_courts(court_id);
