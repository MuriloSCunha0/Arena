-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE event_type AS ENUM ('TOURNAMENT', 'POOL');
CREATE TYPE team_formation_type AS ENUM ('FORMED', 'RANDOM');
CREATE TYPE event_status AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');
CREATE TYPE tournament_status AS ENUM ('CREATED', 'STARTED', 'FINISHED', 'CANCELLED');
CREATE TYPE match_stage AS ENUM ('GROUP', 'ELIMINATION');
CREATE TYPE payment_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('PIX', 'CARD', 'CASH', 'OTHER');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE court_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'BOOKED');
CREATE TYPE court_type AS ENUM ('PADEL', 'BEACH_TENNIS', 'OTHER');
CREATE TYPE reservation_status AS ENUM ('CONFIRMED', 'PENDING', 'CANCELED');
CREATE TYPE organizer_role AS ENUM ('ADMIN', 'ORGANIZER', 'ASSISTANT');

-- 1. Tabelas independentes sem referências externas
-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    user_metadata JSONB,
    app_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORGANIZERS
CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    pix_key VARCHAR(255),
    default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURTS
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    type court_type DEFAULT 'BEACH_TENNIS',
    status court_status DEFAULT 'AVAILABLE',
    surface VARCHAR(50),
    indoor BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela principal de eventos
-- EVENTS
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type event_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL,
    prize TEXT,
    rules TEXT,
    banner_image_url TEXT,
    team_formation team_formation_type NOT NULL,
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    court_ids UUID[] DEFAULT ARRAY[]::UUID[],
    organizer_id UUID REFERENCES organizers(id),
    organizer_commission_rate DECIMAL(5,2),
    status event_status DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabelas que dependem de eventos e tabelas básicas
-- EVENT-COURTS RELATIONSHIP
CREATE TABLE event_courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, court_id)
);

-- EVENT ORGANIZERS
CREATE TABLE event_organizers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role organizer_role NOT NULL DEFAULT 'ASSISTANT',
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- PARTICIPANTS
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL, 
    phone VARCHAR(20) NOT NULL, 
    email VARCHAR(255), 
    birth_date DATE,
    partner_id UUID REFERENCES participants(id),
    partner_name VARCHAR(255),
    ranking INTEGER DEFAULT 0,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    payment_method payment_method,
    payment_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    pix_payment_code TEXT,
    pix_qrcode_url TEXT,
    payment_transaction_id UUID,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_participant_event_phone UNIQUE(event_id, phone),
    CONSTRAINT unique_participant_event_cpf UNIQUE(event_id, cpf)
);

-- 4. Tabelas com dependências circulares - criamos primeiro sem as restrições
-- TOURNAMENTS - Movida para antes de participant_results
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status tournament_status NOT NULL DEFAULT 'CREATED',
    settings JSONB DEFAULT '{"groupSize": 4, "qualifiersPerGroup": 2}'::jsonb,
    type VARCHAR(50) DEFAULT 'TOURNAMENT',
    team_formation team_formation_type,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id)
);

-- COURT RESERVATIONS - Criada sem a restrição de match_id
CREATE TABLE court_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    match_id UUID, -- Restrição adicionada depois
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status reservation_status DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TOURNAMENT MATCHES
CREATE TABLE tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage match_stage NOT NULL,
    group_number INTEGER,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    team1 UUID[],
    team2 UUID[],
    score1 INTEGER,
    score2 INTEGER,
    winner_id VARCHAR(20) CHECK (winner_id IN ('team1', 'team2')),
    completed BOOLEAN DEFAULT FALSE,
    walkover BOOLEAN DEFAULT FALSE,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    court_id UUID REFERENCES courts(id),
    court_reservation_id UUID REFERENCES court_reservations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabelas dependentes que agora podem ser criadas
-- PARTICIPANT RESULTS - Agora tournaments já existe
CREATE TABLE participant_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    position INTEGER, 
    stage VARCHAR(50), 
    points INTEGER,
    notes TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participant_id, tournament_id)
);

CREATE TABLE participant_eliminators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_id UUID NOT NULL REFERENCES participant_results(id) ON DELETE CASCADE,
    eliminator_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(result_id, eliminator_id)
);


-- FINANCIAL TRANSACTIONS
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    type transaction_type NOT NULL,
    description TEXT NOT NULL,
    payment_method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Adicionar restrições de chave estrangeira que faltam
ALTER TABLE court_reservations ADD CONSTRAINT fk_court_reservations_match 
    FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE SET NULL;

-- 7. Índices para otimização de consultas
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_partner_id ON participants(partner_id);
CREATE INDEX idx_participants_payment_status ON participants(payment_status);
CREATE INDEX idx_participants_cpf ON participants(cpf);
CREATE INDEX idx_participants_phone ON participants(phone);
CREATE INDEX idx_participant_results_participant ON participant_results(participant_id);
CREATE INDEX idx_participant_results_tournament ON participant_results(tournament_id);
CREATE INDEX idx_participant_results_position ON participant_results(position);
CREATE INDEX idx_tournaments_event_id ON tournaments(event_id);
CREATE INDEX idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_event_id ON tournament_matches(event_id);
CREATE INDEX idx_tournament_matches_court_id ON tournament_matches(court_id);
CREATE INDEX idx_tournament_matches_stage_round ON tournament_matches(stage, round);
CREATE INDEX idx_tournament_matches_group_number ON tournament_matches(group_number);
CREATE INDEX idx_event_courts_event_id ON event_courts(event_id);
CREATE INDEX idx_event_courts_court_id ON event_courts(court_id);
CREATE INDEX idx_financial_transactions_event_id ON financial_transactions(event_id);
CREATE INDEX idx_financial_transactions_participant_id ON financial_transactions(participant_id);
CREATE INDEX idx_court_reservations_court_id ON court_reservations(court_id);
CREATE INDEX idx_court_reservations_event_id ON court_reservations(event_id);
CREATE INDEX idx_court_reservations_date ON court_reservations(start_time, end_time);

-- 8. Adicionar campo de ranking nos participantes para uso no chaveamento de torneios
-- Note: Campo ranking já foi adicionado à tabela participants
