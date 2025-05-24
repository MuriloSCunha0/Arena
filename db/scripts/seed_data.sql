-- Arena Database Seeding Script
-- This script populates the database with comprehensive test data
-- Includes users, events, courts, tournaments, and more

-- Set timezone to consistent value
SET timezone = 'America/Sao_Paulo';

-- ==========================================================
-- Helper Functions for Data Generation
-- ==========================================================

-- Random date generator function
CREATE OR REPLACE FUNCTION random_date(start_date DATE, end_date DATE) RETURNS DATE AS $$
BEGIN
    RETURN start_date + (random() * (end_date - start_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Random time generator function
CREATE OR REPLACE FUNCTION random_time() RETURNS TIME AS $$
BEGIN
    RETURN (TIMESTAMP '2023-01-01 08:00:00' + random() * INTERVAL '12 hours')::TIME;
END;
$$ LANGUAGE plpgsql;

-- CPF generator function (valid format)
CREATE OR REPLACE FUNCTION random_cpf() RETURNS VARCHAR AS $$
DECLARE
    cpf_base VARCHAR;
BEGIN
    -- Generate 9 base digits
    cpf_base := '';
    FOR i IN 1..9 LOOP
        cpf_base := cpf_base || floor(random() * 10)::INTEGER::VARCHAR;
    END LOOP;
    
    -- Format with standard notation
    RETURN substring(cpf_base from 1 for 3) || '.' || 
           substring(cpf_base from 4 for 3) || '.' || 
           substring(cpf_base from 7 for 3) || '-' || 
           floor(random() * 10)::INTEGER::VARCHAR || floor(random() * 10)::INTEGER::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Phone number generator function
CREATE OR REPLACE FUNCTION random_phone() RETURNS VARCHAR AS $$
BEGIN
    RETURN '(' || (floor(random() * 90) + 10)::VARCHAR || ') 9' || 
           floor(random() * 9000 + 1000)::VARCHAR || '-' || 
           floor(random() * 9000 + 1000)::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Create Regular Users (Non-Admin)
-- ==========================================================

-- Generate 20 regular users
INSERT INTO users (id, email, full_name, cpf, phone, birth_date, user_metadata, app_metadata)
SELECT 
    uuid_generate_v4(),
    'user' || n || '@example.com',
    CASE 
        WHEN n % 2 = 0 THEN 'João Silva ' || n
        WHEN n % 3 = 0 THEN 'Maria Oliveira ' || n
        WHEN n % 5 = 0 THEN 'Pedro Santos ' || n
        WHEN n % 7 = 0 THEN 'Ana Pereira ' || n
        ELSE 'Carlos Souza ' || n
    END,
    random_cpf(),
    random_phone(),
    random_date('1980-01-01'::date, '2000-12-31'::date),
    json_build_object(
        'full_name', CASE 
            WHEN n % 2 = 0 THEN 'João Silva ' || n
            WHEN n % 3 = 0 THEN 'Maria Oliveira ' || n
            WHEN n % 5 = 0 THEN 'Pedro Santos ' || n
            WHEN n % 7 = 0 THEN 'Ana Pereira ' || n
            ELSE 'Carlos Souza ' || n
        END,
        'avatar_url', 'https://randomuser.me/api/portraits/' || 
                     (CASE WHEN n % 2 = 0 THEN 'men' ELSE 'women' END) || 
                     '/' || (n % 70 + 1) || '.jpg'
    ),
    json_build_object(
        'role', 'user'
    )
FROM generate_series(1, 20) AS n;

-- ==========================================================
-- Create Organizers
-- ==========================================================

INSERT INTO organizers (name, phone, email, pix_key, default_commission_rate, active)
VALUES
    ('Arena Sports', random_phone(), 'contato@arenasports.com', 'arena@pix.com', 12.5, true),
    ('Torneios BT', random_phone(), 'contato@torneiosbt.com', 'bt@pix.com', 10, true),
    ('Liga Padel', random_phone(), 'liga@padel.com', 'liga@pix.com', 15, true),
    ('Esporte Total', random_phone(), 'contato@esportetotal.com', 'total@pix.com', 8.5, true),
    ('Areia & Raquete', random_phone(), 'eventos@areia.com', 'areia@pix.com', 11, true);

-- ==========================================================
-- Create Courts
-- ==========================================================

INSERT INTO courts (name, location, type, status, surface, indoor, active, description, image_url)
SELECT 
    CASE 
        WHEN n % 3 = 0 THEN 'Quadra de Beach Tennis ' || n
        WHEN n % 3 = 1 THEN 'Quadra de Padel ' || n
        ELSE 'Quadra Multiuso ' || n
    END,
    CASE 
        WHEN n % 5 = 0 THEN 'Arena Norte'
        WHEN n % 5 = 1 THEN 'Arena Sul'
        WHEN n % 5 = 2 THEN 'Centro Esportivo'
        WHEN n % 5 = 3 THEN 'Clube Municipal'
        ELSE 'Complexo Esportivo Beach'
    END,
    CASE 
        WHEN n % 3 = 0 THEN 'BEACH_TENNIS'
        WHEN n % 3 = 1 THEN 'PADEL'
        ELSE 'OTHER'
    END::court_type,
    CASE 
        WHEN n % 10 = 0 THEN 'MAINTENANCE'
        WHEN n % 20 = 0 THEN 'BOOKED'
        ELSE 'AVAILABLE'
    END::court_status,
    CASE 
        WHEN n % 3 = 0 THEN 'Areia fina'
        WHEN n % 3 = 1 THEN 'Saibro'
        ELSE 'Sintético'
    END,
    n % 3 = 0,
    TRUE,
    CASE 
        WHEN n % 3 = 0 THEN 'Quadra de areia com medidas oficiais para competições de Beach Tennis.'
        WHEN n % 3 = 1 THEN 'Quadra de Padel com paredes de vidro e iluminação de alta qualidade.'
        ELSE 'Quadra multiuso que pode ser adaptada para diferentes modalidades esportivas.'
    END,
    CASE 
        WHEN n % 3 = 0 THEN 'https://images.unsplash.com/photo-1588099768550-4014589e03e0?w=800&h=600'
        WHEN n % 3 = 1 THEN 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&h=600'
        ELSE 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800&h=600'
    END
FROM generate_series(1, 15) AS n;

-- ==========================================================
-- Create Events (Future and Past)
-- ==========================================================

-- Helper variable for court IDs
WITH court_ids AS (SELECT ARRAY_AGG(id) AS ids FROM courts)

-- Insert events
INSERT INTO events (
    type, title, description, location, date, time, price, 
    max_participants, prize, rules, team_formation, 
    categories, court_ids, organizer_id, organizer_commission_rate, status
)
SELECT
    CASE WHEN n % 5 = 0 THEN 'POOL' ELSE 'TOURNAMENT' END::event_type,
    CASE 
        WHEN n % 5 = 0 THEN 'Pool Beach Tennis #' || n
        WHEN n % 5 = 1 THEN 'Torneio de Duplas #' || n
        WHEN n % 5 = 2 THEN 'Campeonato Municipal #' || n
        WHEN n % 5 = 3 THEN 'Copa Arena #' || n
        ELSE 'Circuito BT #' || n
    END,
    'Descrição detalhada do evento ' || n || '. Venha participar deste torneio incrível e competir com os melhores atletas da região.',
    CASE 
        WHEN n % 5 = 0 THEN 'Arena Norte'
        WHEN n % 5 = 1 THEN 'Arena Sul'
        WHEN n % 5 = 2 THEN 'Centro Esportivo'
        WHEN n % 5 = 3 THEN 'Clube Municipal'
        ELSE 'Complexo Esportivo Beach'
    END,
    CASE 
        -- 60% future events, 40% past events
        WHEN n % 10 < 6 THEN random_date(CURRENT_DATE, (CURRENT_DATE + INTERVAL '6 months')::date)
        ELSE random_date((CURRENT_DATE - INTERVAL '6 months')::date, CURRENT_DATE - INTERVAL '1 day')
    END,
    random_time(),
    (50 + (random() * 150)::integer)::decimal(10,2),
    16 * power(2, n % 3), -- 16, 32, 64 participants
    CASE 
        WHEN n % 4 = 0 THEN 'Troféu para os campeões e vice-campeões. R$ ' || (1000 + (n * 100)) || ' em premiação.'
        WHEN n % 4 = 1 THEN 'Medalhas para os finalistas e kits esportivos.'
        WHEN n % 4 = 2 THEN 'R$ ' || (2000 + (n * 200)) || ' divididos entre os melhores colocados.'
        ELSE 'Troféus, medalhas e equipamentos esportivos para os destaques.'
    END,
    'Regras oficiais da modalidade. Formato de disputa: fase de grupos seguida por eliminatórias.',
    CASE WHEN n % 2 = 0 THEN 'FORMED' ELSE 'RANDOM' END::team_formation_type,
    CASE 
        WHEN n % 3 = 0 THEN ARRAY['Iniciante', 'Intermediário']::TEXT[]
        WHEN n % 3 = 1 THEN ARRAY['Intermediário', 'Avançado']::TEXT[]
        ELSE ARRAY['Misto', 'Livre']::TEXT[]
    END,
    (SELECT court_ids.ids[1:floor(random() * 3 + 1)::integer] FROM court_ids), -- Random 1-3 courts
    (SELECT id FROM organizers ORDER BY random() LIMIT 1),
    (7.5 + (random() * 10)::integer)::decimal(5,2),
    CASE 
        WHEN random_date('2023-01-01'::date, '2023-12-31'::date) < CURRENT_DATE THEN 
            CASE 
                WHEN random() < 0.6 THEN 'COMPLETED'
                WHEN random() < 0.8 THEN 'CANCELLED'
                ELSE 'ONGOING'
            END
        ELSE 'SCHEDULED'
    END::event_status
FROM generate_series(1, 10) AS n;

-- Add banner images to some events
UPDATE events 
SET banner_image_url = CASE 
    WHEN id::text ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN 
        'https://picsum.photos/seed/' || id::text || '/1200/500'
    ELSE 'https://picsum.photos/1200/500'
END
WHERE random() < 0.7; -- 70% of events get banner images

-- ==========================================================
-- Create Event-Court Relationships
-- ==========================================================

INSERT INTO event_courts (event_id, court_id)
SELECT e.id, c.id
FROM events e
CROSS JOIN LATERAL (
    SELECT id FROM courts 
    WHERE id = ANY(e.court_ids)
    ORDER BY id
    LIMIT 3
) c
ON CONFLICT (event_id, court_id) DO NOTHING;

-- ==========================================================
-- Create Event Organizers
-- ==========================================================

INSERT INTO event_organizers (event_id, user_id, role, permissions)
WITH user_ids AS (
    SELECT id FROM users WHERE (app_metadata->>'role') = 'user' ORDER BY random() LIMIT 10
)
SELECT 
    e.id,
    u.id,
    'ASSISTANT'::organizer_role,
    json_build_object(
        'can_view', true,
        'can_edit', false,
        'can_delete', false,
        'can_manage_participants', true
    )
FROM events e
CROSS JOIN (SELECT id FROM user_ids ORDER BY random() LIMIT 1) u;

-- ==========================================================
-- Create Regular Participants
-- ==========================================================

DO $$
DECLARE
    event_record RECORD;
    name_prefix VARCHAR[] := ARRAY['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Fernanda', 'Lucas', 'Juliana', 'Rafael', 'Mariana',
                                   'Gustavo', 'Camila', 'Diego', 'Amanda', 'Ricardo', 'Patrícia', 'Felipe', 'Carolina', 'Gabriel', 'Letícia'];
    name_suffix VARCHAR[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes',
                                   'Martins', 'Araújo', 'Carvalho', 'Melo', 'Ribeiro', 'Nascimento', 'Lima', 'Moreira', 'Barbosa', 'Cardoso'];
    min_participants INTEGER := 16;
    max_participants INTEGER;
    num_participants INTEGER;
    i INTEGER;
    current_partner_id UUID;
    participant_id UUID;
    partner_count INTEGER := 0;
    event_hash INTEGER;
BEGIN
    -- For each event
    FOR event_record IN SELECT * FROM events LOOP
        -- Calculate hash for event ID to use in operations
        event_hash := abs(('x' || md5(event_record.id::text))::bit(32)::integer) % 1000;
        
        -- Define number of participants (between 16 and max_participants)
        max_participants := LEAST(event_record.max_participants, 64);
        num_participants := GREATEST(min_participants, (random() * (max_participants - min_participants))::integer + min_participants);
        
        -- Ensure even number of participants for partner pairing
        IF num_participants % 2 != 0 THEN
            num_participants := num_participants + 1;
        END IF;
        
        -- Create participants for this event
        FOR i IN 1..num_participants LOOP
            -- Generate random name
            INSERT INTO participants (
                event_id, name, cpf, phone, email, birth_date,
                payment_status, payment_method, payment_date
            ) VALUES (
                event_record.id,
                name_prefix[1 + (random() * 19)::integer] || ' ' || name_suffix[1 + (random() * 19)::integer],
                random_cpf(),
                random_phone(),
                'participant_' || i || '_' || event_hash || '@example.com',
                random_date('1970-01-01'::date, '2005-12-31'::date),
                CASE WHEN random() < 0.8 THEN 'CONFIRMED' ELSE 'PENDING' END::payment_status,
                CASE 
                    WHEN random() < 0.6 THEN 'PIX'
                    WHEN random() < 0.8 THEN 'CARD'
                    WHEN random() < 0.95 THEN 'CASH'
                    ELSE 'OTHER'
                END::payment_method,
                CASE WHEN random() < 0.8 THEN random_date('2023-01-01'::date, '2023-12-31'::date) ELSE NULL END
            ) RETURNING id INTO participant_id;
            
            -- For FORMED events, create partners for half of participants
            IF event_record.team_formation = 'FORMED' AND i % 2 = 1 THEN
                -- Store this participant's ID to pair with the next one
                current_partner_id := participant_id;
                partner_count := partner_count + 1;
            ELSIF event_record.team_formation = 'FORMED' AND i % 2 = 0 AND current_partner_id IS NOT NULL THEN
                -- Update this participant to have the previous one as partner
                UPDATE participants 
                SET partner_id = current_partner_id,
                    partner_name = (SELECT name FROM participants WHERE id = current_partner_id)
                WHERE id = participant_id;
                
                -- Also update the previous partner to point to this one
                UPDATE participants 
                SET partner_id = participant_id,
                    partner_name = (SELECT name FROM participants WHERE id = participant_id)
                WHERE id = current_partner_id;
                
                current_partner_id := NULL;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Created partnerships for % participants', partner_count;
END $$;

-- ==========================================================
-- Create Tournaments
-- ==========================================================

INSERT INTO tournaments (event_id, status, settings, type, team_formation)
SELECT 
    id, 
    CASE 
        WHEN status = 'SCHEDULED' THEN 'CREATED'
        WHEN status = 'ONGOING' THEN 'STARTED'
        WHEN status = 'COMPLETED' THEN 'FINISHED'
        ELSE 'CANCELLED'
    END::tournament_status,
    json_build_object(
        'groupSize', CASE WHEN random() < 0.7 THEN 4 ELSE 3 END,
        'qualifiersPerGroup', 2,
        'eliminationType', CASE WHEN random() < 0.8 THEN 'SINGLE' ELSE 'DOUBLE' END
    ),
    'TOURNAMENT',
    team_formation
FROM events
WHERE type = 'TOURNAMENT'
ON CONFLICT (event_id) DO UPDATE 
SET status = EXCLUDED.status,
    settings = EXCLUDED.settings;

-- ==========================================================
-- Create Tournament Matches
-- ==========================================================

DO $$
DECLARE
    tournament_record RECORD;
    participants_array UUID[];
    team_array UUID[][];
    court_ids UUID[];
    num_teams INTEGER;
    num_groups INTEGER;
    matches_per_group INTEGER;
    team1 UUID[];
    team2 UUID[];
    match_id UUID;
    group_number INTEGER;
    schedule_base TIMESTAMP;
    current_court INTEGER;
    score1 INTEGER;
    score2 INTEGER;
    winner_id VARCHAR;
    completed BOOLEAN;
    court_id UUID;
    scheduled_time TIMESTAMP;
    participant_id UUID;
    registered_participants INTEGER;
    team_idx INTEGER;
    temp_team UUID[];
BEGIN
    -- Loop through all tournaments with STARTED or FINISHED status
    FOR tournament_record IN 
        SELECT t.*, e.court_ids
        FROM tournaments t
        JOIN events e ON t.event_id = e.id
        WHERE t.status IN ('STARTED', 'FINISHED')
    LOOP
        -- Get participants for this tournament
        participants_array := ARRAY(
            SELECT id FROM participants 
            WHERE event_id = tournament_record.event_id 
            ORDER BY id
        );
        
        registered_participants := array_length(participants_array, 1);
        
        -- Skip if too few participants
        IF registered_participants < 8 THEN
            CONTINUE;
        END IF;
        
        -- Initialize team array
        team_array := ARRAY[]::UUID[][];
        
        IF tournament_record.team_formation = 'FORMED' THEN
            -- For FORMED, get predefined partners
            FOR participant_records IN 
                SELECT p.id, p.partner_id
                FROM participants p
                WHERE p.event_id = tournament_record.event_id
                AND p.partner_id IS NOT NULL
                AND p.id < p.partner_id -- Avoid duplication
            LOOP
                -- Create team with both participants and add to array
                temp_team := ARRAY[participant_records.id, participant_records.partner_id];
                team_array := team_array || ARRAY[temp_team];
            END LOOP;
        ELSE
            -- For RANDOM, create random teams
            FOR i IN 0..((registered_participants/2)-1) LOOP
                IF i*2+2 <= registered_participants THEN
                    temp_team := ARRAY[participants_array[i*2+1], participants_array[i*2+2]];
                    team_array := team_array || ARRAY[temp_team];
                END IF;
            END LOOP;
        END IF;
        
        num_teams := array_length(team_array, 1);
        
        IF num_teams < 4 THEN -- Need at least 4 teams for meaningful tournament
            CONTINUE;
        END IF;
        
        -- Calculate tournament structure
        num_groups := GREATEST(2, num_teams / (tournament_record.settings->>'groupSize')::integer);
        matches_per_group := (((tournament_record.settings->>'groupSize')::integer) * ((tournament_record.settings->>'groupSize')::integer - 1)) / 2;
        
        -- Get courts for scheduling matches
        SELECT ARRAY_AGG(c.id)
        INTO court_ids
        FROM courts c
        WHERE c.id = ANY(tournament_record.court_ids);
        
        -- If no courts available, use default court
        IF court_ids IS NULL OR array_length(court_ids, 1) = 0 THEN
            SELECT ARRAY_AGG(id) INTO court_ids FROM courts WHERE status = 'AVAILABLE' LIMIT 3;
        END IF;
        
        -- Base date/time for scheduling
        SELECT date + time INTO schedule_base FROM events WHERE id = tournament_record.event_id;
        
        -- Create group stage matches
        current_court := 1;
        
        -- For each group
        FOR group_number IN 1..num_groups LOOP
            -- For each possible pairing in group
            FOR i IN 1..((tournament_record.settings->>'groupSize')::integer-1) LOOP
                FOR j IN i+1..((tournament_record.settings->>'groupSize')::integer) LOOP
                    -- Get teams for this group
                    team_idx := (group_number-1) * ((tournament_record.settings->>'groupSize')::integer) + i;
                    IF team_idx <= num_teams THEN
                        team1 := team_array[team_idx];
                    ELSE
                        CONTINUE;
                    END IF;
                    
                    team_idx := (group_number-1) * ((tournament_record.settings->>'groupSize')::integer) + j;
                    IF team_idx <= num_teams THEN
                        team2 := team_array[team_idx];
                    ELSE
                        CONTINUE;
                    END IF;
                    
                    -- Schedule the match
                    court_id := court_ids[(current_court % array_length(court_ids, 1)) + 1];
                    scheduled_time := schedule_base + (((group_number-1) * matches_per_group + (i-1)*(tournament_record.settings->>'groupSize')::integer-i*(i-1)/2+j-i-1)) * interval '1 hour');
                    
                    -- For FINISHED tournaments, all matches are completed
                    -- For STARTED tournaments, some matches are completed
                    IF tournament_record.status = 'FINISHED' OR random() < 0.8 THEN
                        completed := TRUE;
                        score1 := (random() * 20)::integer + 10;
                        score2 := (random() * 20)::integer + 10;
                        
                        -- Ensure no ties
                        IF score1 = score2 THEN
                            IF random() < 0.5 THEN score1 := score1 + 1; ELSE score2 := score2 + 1; END IF;
                        END IF;
                        
                        winner_id := CASE WHEN score1 > score2 THEN 'team1' ELSE 'team2' END;
                    ELSE
                        completed := FALSE;
                        score1 := NULL;
                        score2 := NULL;
                        winner_id := NULL;
                    END IF;
                    
                    -- Insert the match
                    INSERT INTO tournament_matches (
                        tournament_id, event_id, stage, group_number, round, position,
                        team1, team2, score1, score2, winner_id, completed,
                        scheduled_time, court_id
                    ) VALUES (
                        tournament_record.id, tournament_record.event_id, 'GROUP', group_number, 1, 
                        (i-1)*(tournament_record.settings->>'groupSize')::integer-i*(i-1)/2+j-i,
                        team1, team2, score1, score2, winner_id, completed,
                        scheduled_time, court_id
                    );
                    
                    current_court := current_court + 1;
                END LOOP;
            END LOOP;
        END LOOP;
        
        -- For FINISHED tournaments, add elimination round matches
        IF tournament_record.status = 'FINISHED' THEN
            -- Simplification: Add 2 elimination rounds (quarters & semis)
            -- Round 1 - quarters
            FOR i IN 1..4 LOOP
                IF i <= num_teams AND i+4 <= num_teams THEN
                    team1 := team_array[i];
                    team2 := team_array[i+4];
                    
                    scheduled_time := schedule_base + ((num_groups * matches_per_group) + i) * interval '1 hour';
                    court_id := court_ids[(i % array_length(court_ids, 1)) + 1];
                    
                    score1 := (random() * 20)::integer + 10;
                    score2 := (random() * 20)::integer + 10;
                    
                    -- Ensure no ties
                    IF score1 = score2 THEN
                        IF random() < 0.5 THEN score1 := score1 + 1; ELSE score2 := score2 + 1; END IF;
                    END IF;
                    
                    winner_id := CASE WHEN score1 > score2 THEN 'team1' ELSE 'team2' END;
                    
                    INSERT INTO tournament_matches (
                        tournament_id, event_id, stage, round, position,
                        team1, team2, score1, score2, winner_id, completed,
                        scheduled_time, court_id
                    ) VALUES (
                        tournament_record.id, tournament_record.event_id, 'ELIMINATION', 1, i,
                        team1, team2, score1, score2, winner_id, TRUE,
                        scheduled_time, court_id
                    ) RETURNING id INTO match_id;
                END IF;
            END LOOP;
            
            -- Round 2 - semis
            FOR i IN 1..2 LOOP
                IF i*2-1 <= num_teams AND i*2 <= num_teams THEN
                    scheduled_time := schedule_base + ((num_groups * matches_per_group) + 4 + i) * interval '1 hour';
                    court_id := court_ids[(i % array_length(court_ids, 1)) + 1];
                    
                    team1 := team_array[i*2-1];
                    team2 := team_array[i*2];
                    
                    score1 := (random() * 20)::integer + 10;
                    score2 := (random() * 20)::integer + 10;
                    
                    -- Ensure no ties
                    IF score1 = score2 THEN
                        IF random() < 0.5 THEN score1 := score1 + 1; ELSE score2 := score2 + 1; END IF;
                    END IF;
                    
                    winner_id := CASE WHEN score1 > score2 THEN 'team1' ELSE 'team2' END;
                    
                    INSERT INTO tournament_matches (
                        tournament_id, event_id, stage, round, position,
                        team1, team2, score1, score2, winner_id, completed,
                        scheduled_time, court_id
                    ) VALUES (
                        tournament_record.id, tournament_record.event_id, 'ELIMINATION', 2, i,
                        team1, team2, score1, score2, winner_id, TRUE,
                        scheduled_time, court_id
                    );
                END IF;
            END LOOP;
            
            -- Final match
            IF num_teams >= 2 THEN
                scheduled_time := schedule_base + ((num_groups * matches_per_group) + 7) * interval '1 hour';
                court_id := court_ids[1];
                
                team1 := team_array[1];
                team2 := team_array[2];
                
                score1 := (random() * 20)::integer + 10;
                score2 := (random() * 20)::integer + 10;
                
                -- Ensure no ties
                IF score1 = score2 THEN
                    IF random() < 0.5 THEN score1 := score1 + 1; ELSE score2 := score2 + 1; END IF;
                END IF;
                
                winner_id := CASE WHEN score1 > score2 THEN 'team1' ELSE 'team2' END;
                
                INSERT INTO tournament_matches (
                    tournament_id, event_id, stage, round, position,
                    team1, team2, score1, score2, winner_id, completed,
                    scheduled_time, court_id
                ) VALUES (
                    tournament_record.id, tournament_record.event_id, 'ELIMINATION', 3, 1,
                    team1, team2, score1, score2, winner_id, TRUE,
                    scheduled_time, court_id
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- ==========================================================
-- Create Participant Results
-- ==========================================================

INSERT INTO participant_results (participant_id, tournament_id, event_id, position, stage, points, notes)
SELECT 
    p.id,
    t.id,
    p.event_id,
    CASE 
        WHEN random() < 0.1 THEN 1
        WHEN random() < 0.2 THEN 2
        WHEN random() < 0.3 THEN 3
        WHEN random() < 0.5 THEN (random() * 4 + 4)::integer
        ELSE NULL
    END,
    CASE 
        WHEN random() < 0.7 THEN 'GROUP'
        ELSE 'ELIMINATION'
    END,
    CASE 
        WHEN random() < 0.1 THEN 100
        WHEN random() < 0.3 THEN 75
        WHEN random() < 0.6 THEN 50
        ELSE 25
    END,
    CASE 
        WHEN random() < 0.2 THEN 'Desempenho excelente durante todo o torneio.'
        WHEN random() < 0.4 THEN 'Melhorou significativamente ao longo das partidas.'
        ELSE NULL
    END
FROM participants p
JOIN tournaments t ON p.event_id = t.event_id
WHERE t.status = 'FINISHED'
AND random() < 0.8; -- Only for some participants, not all

-- ==========================================================
-- Create Court Reservations
-- ==========================================================

-- Reservations related to matches
INSERT INTO court_reservations (
    court_id, event_id, match_id, title, start_time, end_time, status
)
SELECT 
    m.court_id,
    m.event_id,
    m.id,
    'Partida ' || m.stage || ' - Rodada ' || m.round, 
    m.scheduled_time,
    m.scheduled_time + interval '1 hour',
    'CONFIRMED'::reservation_status
FROM tournament_matches m
WHERE m.court_id IS NOT NULL 
AND m.scheduled_time IS NOT NULL;

-- Additional reservations not related to matches
INSERT INTO court_reservations (
    court_id, title, start_time, end_time, status
)
SELECT 
    id,
    'Reserva Particular',
    (CURRENT_DATE + (random() * 30)::integer * interval '1 day')::date + (8 + (random() * 10)::integer) * interval '1 hour',
    (CURRENT_DATE + (random() * 30)::integer * interval '1 day')::date + (9 + (random() * 10)::integer) * interval '1 hour',
    CASE 
        WHEN random() < 0.8 THEN 'CONFIRMED'
        WHEN random() < 0.9 THEN 'PENDING'
        ELSE 'CANCELED'
    END::reservation_status
FROM courts
WHERE random() < 0.7
LIMIT 25;

-- ==========================================================
-- Create Financial Transactions
-- ==========================================================

-- Participant payment transactions
INSERT INTO financial_transactions (
    event_id, participant_id, amount, type, description, 
    payment_method, status, transaction_date
)
SELECT 
    p.event_id,
    p.id,
    e.price,
    'INCOME'::transaction_type,
    'Inscrição de participante ' || p.name,
    COALESCE(p.payment_method, 'OTHER')::payment_method,
    p.payment_status,
    p.payment_date
FROM participants p
JOIN events e ON p.event_id = e.id
WHERE p.payment_status = 'CONFIRMED'
AND p.payment_date IS NOT NULL;

-- Additional expense transactions
INSERT INTO financial_transactions (
    event_id, amount, type, description, payment_method, status, transaction_date
)
SELECT 
    id,
    (random() * 500 + 100)::decimal(10,2),
    'EXPENSE'::transaction_type,
    CASE 
        WHEN random() < 0.3 THEN 'Pagamento de arbitragem'
        WHEN random() < 0.5 THEN 'Aluguel de quadras'
        WHEN random() < 0.7 THEN 'Material esportivo'
        WHEN random() < 0.9 THEN 'Premiações'
        ELSE 'Despesas administrativas'
    END,
    CASE 
        WHEN random() < 0.5 THEN 'PIX'
        WHEN random() < 0.8 THEN 'CARD'
        ELSE 'CASH'
    END::payment_method,
    CASE 
        WHEN random() < 0.9 THEN 'CONFIRMED'
        ELSE 'PENDING'
    END::payment_status,
    random_date('2023-01-01'::date, '2023-12-31'::date)::timestamp
FROM events
WHERE status = 'COMPLETED'
AND random() < 0.8
LIMIT 50;

-- ==========================================================
-- Cleanup
-- ==========================================================

-- Drop temporary functions
DROP FUNCTION IF EXISTS random_date;
DROP FUNCTION IF EXISTS random_time;
DROP FUNCTION IF EXISTS random_cpf;
DROP FUNCTION IF EXISTS random_phone;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Database seeding completed successfully.';
END $$;
