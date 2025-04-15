-- Arena application database schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    user_metadata JSONB DEFAULT '{}',
    app_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORGANIZERS TABLE
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  pix_key TEXT,
  default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage of event revenue
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- EVENTS TABLE
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('TOURNAMENT', 'POOL')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL DEFAULT 0,
    prize TEXT,
    rules TEXT,
    banner_image_url TEXT,
    team_formation VARCHAR(20) NOT NULL CHECK (team_formation IN ('FORMED', 'RANDOM')),
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organizer_id UUID REFERENCES organizers(id),
    organizer_commission_rate DECIMAL(5,2)
);

-- PARTICIPANTS TABLE
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    partner_id UUID REFERENCES participants(id),
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PENDING', 'CONFIRMED')),
    payment_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    birthdate DATE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pix_payment_code TEXT,
    pix_qrcode_url TEXT,
    payment_transaction_id TEXT
);

-- COURTS TABLE
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EVENT_COURTS TABLE (Association between events and courts)
CREATE TABLE event_courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    UNIQUE(event_id, court_id)
);

-- TOURNAMENTS TABLE
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rounds INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CREATED', 'STARTED', 'FINISHED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    visualization_data JSONB,
    bracket_generation_time TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id)
);

-- TOURNAMENT_MATCHES TABLE
CREATE TABLE tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    team1 UUID[] DEFAULT NULL,
    team2 UUID[] DEFAULT NULL,
    score1 INTEGER,
    score2 INTEGER,
    winner_id VARCHAR(20) CHECK (winner_id IN ('team1', 'team2')),
    completed BOOLEAN DEFAULT FALSE,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    court_id UUID REFERENCES courts(id),
    court_reservation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FINANCIAL TRANSACTIONS TABLE
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    description TEXT NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('PIX', 'CARD', 'CASH', 'OTHER')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EVENT ORGANIZERS TABLE (Association between events and organizing users)
CREATE TABLE event_organizers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ORGANIZER', 'ASSISTANT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- COURT RESERVATIONS TABLE
CREATE TABLE court_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES to improve query performance
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_event_id ON tournament_matches(event_id);
CREATE INDEX idx_financial_transactions_event_id ON financial_transactions(event_id);
CREATE INDEX idx_event_organizers_event_id ON event_organizers(event_id);
CREATE INDEX idx_event_organizers_user_id ON event_organizers(user_id);
CREATE INDEX idx_court_reservations_court_id ON court_reservations(court_id);
CREATE INDEX idx_court_reservations_event_id ON court_reservations(event_id);
