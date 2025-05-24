-- Arena - Comprehensive Database Schema
-- This script creates an optimized schema for the Arena sports management platform

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- Create ENUM Types
-- ==========================================================

-- Event-related ENUMs
CREATE TYPE event_type AS ENUM ('TOURNAMENT', 'POOL');
CREATE TYPE team_formation_type AS ENUM ('FORMED', 'RANDOM');
CREATE TYPE event_status AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- Tournament-related ENUMs
CREATE TYPE tournament_status AS ENUM ('CREATED', 'STARTED', 'FINISHED', 'CANCELLED');
CREATE TYPE match_stage AS ENUM ('GROUP', 'ELIMINATION');

-- Payment-related ENUMs
CREATE TYPE payment_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('PIX', 'CARD', 'CASH', 'OTHER');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

-- Court-related ENUMs
CREATE TYPE court_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'BOOKED');
CREATE TYPE court_type AS ENUM ('PADEL', 'BEACH_TENNIS', 'OTHER');
CREATE TYPE reservation_status AS ENUM ('CONFIRMED', 'PENDING', 'CANCELED');

-- User and organizer ENUMs
CREATE TYPE organizer_role AS ENUM ('ADMIN', 'ORGANIZER', 'ASSISTANT');

-- ==========================================================
-- Create Base Tables (No Foreign Key References)
-- ==========================================================

-- Users table (integrated with Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    cpf VARCHAR(14),
    phone VARCHAR(20),
    birth_date DATE,
    user_metadata JSONB,
    app_metadata JSONB,
    tournaments_history JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Format validations
    CONSTRAINT users_cpf_format CHECK (
        cpf IS NULL OR cpf ~* '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$'
    ),
    CONSTRAINT users_phone_format CHECK (
        phone IS NULL OR phone ~* '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'
    )
);

-- Organizers table
CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    pix_key VARCHAR(255),
    default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT organizers_phone_format CHECK (
        phone ~* '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'
    )
);

-- Courts table
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

-- ==========================================================
-- Create Main Event Table
-- ==========================================================

-- Events table
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

-- ==========================================================
-- Create Junction and Dependent Tables
-- ==========================================================

-- Event-Courts relationship table
CREATE TABLE event_courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, court_id)
);

-- Event organizers table
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

-- Participants table
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
    CONSTRAINT unique_participant_event_cpf UNIQUE(event_id, cpf),
    CONSTRAINT participants_cpf_format CHECK (
        cpf ~* '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$'
    ),
    CONSTRAINT participants_phone_format CHECK (
        phone ~* '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'
    )
);

-- Tournaments table
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

-- Court reservations table (creates first without match_id constraint)
CREATE TABLE court_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    match_id UUID, -- Constraint added after tournament_matches table
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status reservation_status DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent overlapping reservations for the same court
    CONSTRAINT no_overlapping_reservations EXCLUDE USING gist (
        court_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status = 'CONFIRMED')
);

-- Tournament matches table
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

-- Participant results table
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

-- Participant eliminators table
CREATE TABLE participant_eliminators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_id UUID NOT NULL REFERENCES participant_results(id) ON DELETE CASCADE,
    eliminator_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(result_id, eliminator_id)
);

-- Financial transactions table
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

-- ==========================================================
-- Add Remaining Constraints
-- ==========================================================

ALTER TABLE court_reservations 
ADD CONSTRAINT fk_court_reservations_match 
FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE SET NULL;

-- ==========================================================
-- Create Indexes
-- ==========================================================

-- Participant indexes
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_partner_id ON participants(partner_id);
CREATE INDEX idx_participants_payment_status ON participants(payment_status);
CREATE INDEX idx_participants_name ON participants(name);
CREATE INDEX idx_participants_cpf ON participants(cpf);
CREATE INDEX idx_participants_phone ON participants(phone);

-- Tournament indexes
CREATE INDEX idx_tournaments_event_id ON tournaments(event_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);

-- Tournament matches indexes
CREATE INDEX idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_event_id ON tournament_matches(event_id);
CREATE INDEX idx_tournament_matches_court_id ON tournament_matches(court_id);
CREATE INDEX idx_tournament_matches_stage_round ON tournament_matches(stage, round);
CREATE INDEX idx_tournament_matches_group_number ON tournament_matches(group_number);
CREATE INDEX idx_tournament_matches_completed ON tournament_matches(completed);
CREATE INDEX idx_tournament_matches_scheduled_time ON tournament_matches(scheduled_time);

-- Participant results indexes
CREATE INDEX idx_participant_results_participant ON participant_results(participant_id);
CREATE INDEX idx_participant_results_tournament ON participant_results(tournament_id);
CREATE INDEX idx_participant_results_position ON participant_results(position);

-- Event indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_type ON events(type);

-- Court indexes
CREATE INDEX idx_courts_status ON courts(status);
CREATE INDEX idx_courts_type ON courts(type);

-- Junction table indexes
CREATE INDEX idx_event_courts_event_id ON event_courts(event_id);
CREATE INDEX idx_event_courts_court_id ON event_courts(court_id);

-- Financial transaction indexes
CREATE INDEX idx_financial_transactions_event_id ON financial_transactions(event_id);
CREATE INDEX idx_financial_transactions_participant_id ON financial_transactions(participant_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);

-- Court reservations indexes
CREATE INDEX idx_court_reservations_court_id ON court_reservations(court_id);
CREATE INDEX idx_court_reservations_event_id ON court_reservations(event_id);
CREATE INDEX idx_court_reservations_date ON court_reservations(start_time, end_time);
CREATE INDEX idx_court_reservations_status ON court_reservations(status);

-- ==========================================================
-- Create Update Timestamp Trigger Function
-- ==========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ==========================================================
-- Apply Update Timestamp Triggers to Tables
-- ==========================================================

-- Create triggers for all tables with updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t);
    END LOOP;
END;
$$;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
END $$;
