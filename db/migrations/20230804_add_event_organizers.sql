-- Tabela para organizadores de eventos
CREATE TABLE IF NOT EXISTS event_organizers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'ORGANIZER', -- ADMIN, ORGANIZER, ASSISTANT
  permissions JSONB, -- Permissões específicas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Índice para consultas de organizadores por evento
CREATE INDEX IF NOT EXISTS idx_event_organizers_event_id ON event_organizers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_organizers_user_id ON event_organizers(user_id);
