-- Criação das tabelas para o projeto Arena Conexão Admin

-- Tabela de eventos
CREATE TABLE events (
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
  categories TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de participantes
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  partner_id UUID REFERENCES participants(id),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('PENDING', 'CONFIRMED')),
  payment_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL,
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

-- Tabela de torneios
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rounds INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'STARTED', 'FINISHED')),
  CONSTRAINT unique_tournament_per_event UNIQUE (event_id)
);

-- Tabela de partidas do torneio
CREATE TABLE tournament_matches (
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

-- Tabela de transações financeiras
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id),
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'CARD', 'CASH', 'OTHER')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente o campo updated_at
CREATE TRIGGER update_events_modtime
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE PROCEDURE update_modified_column();

-- Políticas de segurança para RLS (Row Level Security)

-- Habilitar RLS para todas as tabelas
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso autenticado
CREATE POLICY "Autenticados podem ler eventos" ON events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem criar eventos" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar eventos" ON events
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem excluir eventos" ON events
  FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas similares para as outras tabelas
CREATE POLICY "Autenticados podem ler participantes" ON participants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem criar participantes" ON participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar participantes" ON participants
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem excluir participantes" ON participants
  FOR DELETE USING (auth.role() = 'authenticated');

-- Torneios
CREATE POLICY "Autenticados podem ler torneios" ON tournaments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem criar torneios" ON tournaments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar torneios" ON tournaments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem excluir torneios" ON tournaments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Partidas
CREATE POLICY "Autenticados podem ler partidas" ON tournament_matches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem criar partidas" ON tournament_matches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar partidas" ON tournament_matches
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem excluir partidas" ON tournament_matches
  FOR DELETE USING (auth.role() = 'authenticated');

-- Transações financeiras
CREATE POLICY "Autenticados podem ler transações" ON financial_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem criar transações" ON financial_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar transações" ON financial_transactions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem excluir transações" ON financial_transactions
  FOR DELETE USING (auth.role() = 'authenticated');
