-- Arena application test data

-- ADMIN USERS (for system administrators and organizers)
INSERT INTO users (email, user_metadata, app_metadata) VALUES
('admin@arenaarena.com', 
  '{"name": "Administrador Principal", "avatar_url": "https://i.pravatar.cc/150?img=1"}', 
  '{"role": "admin"}'
),
('organizador@arenaarena.com', 
  '{"name": "Organizador Eventos", "avatar_url": "https://i.pravatar.cc/150?img=2"}', 
  '{"role": "organizer"}'
),
('assistente@arenaarena.com', 
  '{"name": "Assistente Arena", "avatar_url": "https://i.pravatar.cc/150?img=3"}', 
  '{"role": "assistant"}'
);

-- COURTS
INSERT INTO courts (name, location, description) VALUES
('Quadra 01', 'Arena Conexão', 'Quadra oficial WPT com iluminação de LED'),
('Quadra 02', 'Arena Conexão', 'Quadra oficial WPT com iluminação de LED'),
('Quadra 03', 'Arena Conexão', 'Quadra de treinamento'),
('Quadra 04', 'Arena Conexão', 'Quadra de treinamento'),
('Quadra 05', 'Arena Conexão Central', 'Quadra oficial com arquibancadas'),
('Quadra 06', 'Arena Conexão Central', 'Quadra oficial com arquibancadas');

-- EVENTS (10 events with different types and statuses)
INSERT INTO events (type, title, description, location, date, time, price, max_participants, prize, rules, team_formation, categories) VALUES
-- Past Events
('TOURNAMENT', 'Torneio de Padel - Outubro 2023', 
  'Venha participar do nosso torneio mensal de padel. Competição em duplas com premiação para os três primeiros lugares.', 
  'Arena Conexão', '2023-10-15', '09:00', 150.00, 32, 
  'R$ 3000 em premiação (divididos entre os 3 primeiros)', 
  'Regras oficiais de padel. Cada partida será melhor de 3 sets.', 
  'FORMED', ARRAY['Masculino', 'Iniciante']),

('TOURNAMENT', 'Torneio de Padel - Novembro 2023', 
  'Edição especial do nosso torneio mensal de padel. Competição em duplas.', 
  'Arena Conexão', '2023-11-20', '10:00', 180.00, 48, 
  'R$ 4500 em premiação (divididos entre os 3 primeiros)', 
  'Regras oficiais de padel. Cada partida será melhor de 3 sets.', 
  'FORMED', ARRAY['Misto', 'Avançado']),

('POOL', 'Bolão Copa do Brasil 2023', 
  'Participe do bolão oficial da Arena Conexão para a Copa do Brasil 2023.', 
  'Online', '2023-09-01', '18:00', 50.00, 100, 
  'R$ 3000 para o primeiro lugar', 
  'Cada participante deve enviar seus palpites até 30 minutos antes do início dos jogos.', 
  'RANDOM', ARRAY['Futebol', 'Copa do Brasil']),

('TOURNAMENT', 'Torneio de Padel - Dezembro 2023', 
  'Torneio de encerramento do ano. Venha se divertir e competir!', 
  'Arena Conexão Central', '2023-12-17', '10:00', 200.00, 32, 
  'R$ 5000 em premiação', 
  'Regras oficiais de padel. Cada partida será melhor de 3 sets.', 
  'FORMED', ARRAY['Masculino', 'Feminino', 'Avançado']),

-- Current/Upcoming Events
('TOURNAMENT', 'Torneio de Padel - Janeiro 2024', 
  'Primeiro torneio do ano! Venha começar 2024 com o pé direito!', 
  'Arena Conexão', CURRENT_DATE + INTERVAL '7 days', '09:00', 180.00, 32, 
  'R$ 4000 em premiação', 
  'Regras oficiais de padel. Cada partida será melhor de 3 sets.', 
  'FORMED', ARRAY['Misto', 'Intermediário']),

('TOURNAMENT', 'Torneio de Verão 2024', 
  'Torneio especial de verão com categorias para todos os níveis.', 
  'Arena Conexão Central', CURRENT_DATE + INTERVAL '14 days', '10:00', 220.00, 48, 
  'R$ 6000 em premiação', 
  'Regras oficiais de padel com adaptações para iniciantes nas categorias básicas.', 
  'FORMED', ARRAY['Masculino', 'Feminino', 'Iniciante', 'Intermediário', 'Avançado']),

('POOL', 'Bolão Campeonato Estadual 2024', 
  'Faça seus palpites para o campeonato estadual e concorra a prêmios!', 
  'Online', CURRENT_DATE + INTERVAL '3 days', '20:00', 40.00, 200, 
  'R$ 5000 em prêmios', 
  'Regras disponíveis no site da Arena Conexão.', 
  'RANDOM', ARRAY['Futebol', 'Estadual']),

-- Future Events
('TOURNAMENT', 'Torneio de Padel - Fevereiro 2024', 
  'Torneio especial de Carnaval. Vista sua fantasia e venha jogar!', 
  'Arena Conexão', CURRENT_DATE + INTERVAL '30 days', '10:00', 190.00, 32, 
  'R$ 4500 em premiação', 
  'Regras oficiais de padel. Fantasias são incentivadas mas não obrigatórias.', 
  'FORMED', ARRAY['Masculino', 'Feminino', 'Misto', 'Fantasia']),

('TOURNAMENT', 'Copa Arena Conexão 2024', 
  'O maior torneio do ano! Não perca essa oportunidade de competir no mais tradicional torneio de padel da região.', 
  'Arena Conexão Central', CURRENT_DATE + INTERVAL '60 days', '08:00', 250.00, 64, 
  'R$ 10000 em premiação + Troféus + Contratos de patrocínio para os vencedores', 
  'Regras oficiais de padel com supervisão de árbitros profissionais.', 
  'FORMED', ARRAY['Masculino PRO', 'Feminino PRO', 'Misto PRO']),

('POOL', 'Bolão Copa do Mundo 2024', 
  'O tradicional bolão para a Copa do Mundo! Faça seus palpites e concorra a prêmios incríveis.', 
  'Online', CURRENT_DATE + INTERVAL '90 days', '18:00', 100.00, 500, 
  'Carro 0km para o primeiro lugar + Diversos prêmios', 
  'Regras disponíveis no site da Arena Conexão. Palpites devem ser enviados até 1 hora antes de cada jogo.', 
  'RANDOM', ARRAY['Futebol', 'Copa do Mundo']);

-- ASSOCIATE COURTS WITH EVENTS
-- For each event, assign 2-3 courts
DO $$
DECLARE
    event_record RECORD;
    court_record RECORD;
    court_count INTEGER;
BEGIN
    FOR event_record IN SELECT id FROM events LOOP
        court_count := floor(random() * 2) + 2; -- 2-3 courts per event
        
        FOR court_record IN SELECT id FROM courts ORDER BY random() LIMIT court_count LOOP
            INSERT INTO event_courts (event_id, court_id)
            VALUES (event_record.id, court_record.id);
        END LOOP;
    END LOOP;
END $$;

-- PARTICIPANTS (several participants for each event)
-- Generate the correct number of participants for each event (50-80% of max_participants)
DO $$
DECLARE
    event_record RECORD;
    participant_count INTEGER;
    i INTEGER;
    names TEXT[] := ARRAY[
        'João Silva', 'Maria Santos', 'Pedro Almeida', 'Ana Oliveira', 'Lucas Costa', 
        'Juliana Ferreira', 'Carlos Rodrigues', 'Fernanda Lima', 'Rafael Gomes', 'Patrícia Martins',
        'Marcos Ribeiro', 'Camila Sousa', 'Bruno Andrade', 'Amanda Pereira', 'Rodrigo Castro',
        'Vanessa Carvalho', 'Ricardo Barbosa', 'Daniela Nunes', 'André Cardoso', 'Mariana Teixeira',
        'Gustavo Moreira', 'Beatriz Correia', 'Felipe Azevedo', 'Letícia Mendes', 'Eduardo Barros',
        'Carolina Moura', 'Marcelo Dias', 'Roberta Campos', 'Guilherme Duarte', 'Melissa Pinto',
        'Leonardo Araújo', 'Natália Freitas', 'Thiago Rocha', 'Isabela Santana', 'Vinícius Castro',
        'Larissa Neves', 'Renato Silveira', 'Tatiana Lopes', 'Alexandre Melo', 'Luísa Moraes',
        'Leandro Fonseca', 'Cristina Nascimento', 'Diego Pacheco', 'Jéssica Cardoso', 'Fábio Nogueira',
        'Bruna Ramos', 'Hugo Cavalcanti', 'Gabriela Vieira', 'Matheus Alves', 'Elisa Monteiro'
    ];
    phone_prefix TEXT[] := ARRAY['11', '12', '13', '14', '15', '16', '17', '19', '21', '22', '24', '27', '31', '32', '35', '41', '42', '47', '51', '54', '61', '62', '71', '81', '85'];
BEGIN
    FOR event_record IN SELECT * FROM events LOOP
        -- Calculate how many participants to generate (50-80% of max_participants)
        participant_count := floor(event_record.max_participants * (random() * 0.3 + 0.5));
        
        FOR i IN 1..participant_count LOOP
            INSERT INTO participants (
                event_id, name, email, phone, payment_status, 
                payment_id, payment_date, registered_at
            )
            VALUES (
                event_record.id,
                names[floor(random() * array_length(names, 1)) + 1], -- Random name from names array
                'participant_' || floor(random() * 10000) || '@example.com', -- Random email
                phone_prefix[floor(random() * array_length(phone_prefix, 1)) + 1] || ' 9' || lpad(floor(random() * 99999999)::text, 8, '0'), -- Random phone
                CASE WHEN random() < 0.8 THEN 'CONFIRMED' ELSE 'PENDING' END, -- 80% confirmed, 20% pending
                CASE WHEN random() < 0.8 THEN 'pix_' || floor(random() * 1000000) ELSE NULL END,
                CASE WHEN random() < 0.8 THEN NOW() - (random() * interval '30 days') ELSE NULL END,
                NOW() - (random() * interval '60 days') -- Registration date
            );
        END LOOP;
    END LOOP;
END $$;

-- For FORMED teams, create partner relationships (only for TOURNAMENT events with FORMED team_formation)
DO $$
DECLARE
    event_record RECORD;
    participant_record RECORD;
    partner_record RECORD;
BEGIN
    FOR event_record IN SELECT id FROM events WHERE type = 'TOURNAMENT' AND team_formation = 'FORMED' LOOP
        -- Get all participants without partner in this event
        FOR participant_record IN SELECT id FROM participants WHERE event_id = event_record.id AND partner_id IS NULL LOOP
            -- Find another participant without partner
            SELECT id INTO partner_record FROM participants 
            WHERE event_id = event_record.id AND id != participant_record.id AND partner_id IS NULL
            LIMIT 1;
            
            IF partner_record.id IS NOT NULL THEN
                -- Create partnership
                UPDATE participants SET partner_id = partner_record.id WHERE id = participant_record.id;
                UPDATE participants SET partner_id = participant_record.id WHERE id = partner_record.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- TOURNAMENTS (create a tournament for each past and current TOURNAMENT event)
INSERT INTO tournaments (event_id, rounds, status)
SELECT id, 
       CEIL(LOG(2, max_participants / 2)) AS rounds, -- Calculate required rounds based on participants
       CASE 
           WHEN date < CURRENT_DATE - INTERVAL '7 days' THEN 'FINISHED'
           WHEN date < CURRENT_DATE THEN 'STARTED'
           ELSE 'CREATED'
       END AS status
FROM events
WHERE type = 'TOURNAMENT' AND date <= CURRENT_DATE + INTERVAL '14 days';

-- FINANCIAL TRANSACTIONS
-- For each participant with CONFIRMED payment status, create an income transaction
INSERT INTO financial_transactions (
    event_id, participant_id, amount, type, description, payment_method, status, transaction_date
)
SELECT 
    p.event_id,
    p.id AS participant_id,
    e.price AS amount,
    'INCOME' AS type,
    'Inscrição - ' || p.name AS description,
    CASE floor(random() * 3)
        WHEN 0 THEN 'PIX'
        WHEN 1 THEN 'CARD'
        ELSE 'CASH'
    END AS payment_method,
    p.payment_status AS status,
    p.registered_at + (random() * interval '2 days') AS transaction_date
FROM 
    participants p
JOIN 
    events e ON p.event_id = e.id
WHERE 
    p.payment_status = 'CONFIRMED';

-- Add expense transactions for each event
INSERT INTO financial_transactions (
    event_id, amount, type, description, payment_method, status, transaction_date
)
SELECT 
    id AS event_id,
    price * 0.2 * (floor(random() * 3) + 1) AS amount, -- 20-60% of price as expense
    'EXPENSE' AS type,
    CASE floor(random() * 4)
        WHEN 0 THEN 'Aluguel de quadras'
        WHEN 1 THEN 'Material esportivo'
        WHEN 2 THEN 'Alimentação e bebidas'
        ELSE 'Prêmios e troféus'
    END AS description,
    CASE floor(random() * 3)
        WHEN 0 THEN 'PIX'
        WHEN 1 THEN 'CARD'
        ELSE 'CASH'
    END AS payment_method,
    'CONFIRMED' AS status,
    date::timestamp - (random() * interval '7 days') AS transaction_date
FROM 
    events;

-- Add random additional expenses
INSERT INTO financial_transactions (
    event_id, amount, type, description, payment_method, status, transaction_date
)
SELECT 
    id AS event_id,
    (random() * 500 + 100)::decimal(10,2) AS amount,
    'EXPENSE' AS type,
    CASE floor(random() * 5)
        WHEN 0 THEN 'Arbitragem'
        WHEN 1 THEN 'Segurança'
        WHEN 2 THEN 'Limpeza'
        WHEN 3 THEN 'Marketing'
        ELSE 'Despesas diversas'
    END AS description,
    CASE floor(random() * 3)
        WHEN 0 THEN 'PIX'
        WHEN 1 THEN 'CARD'
        ELSE 'CASH'
    END AS payment_method,
    CASE WHEN random() < 0.9 THEN 'CONFIRMED' ELSE 'PENDING' END AS status,
    date::timestamp - (random() * interval '10 days') AS transaction_date
FROM 
    events
ORDER BY random()
LIMIT 20;

-- EVENT ORGANIZERS (assign organizers to events)
DO $$
DECLARE
    event_record RECORD;
    admin_user_id UUID;
    organizer_user_id UUID;
    assistant_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@arenaarena.com';
    SELECT id INTO organizer_user_id FROM users WHERE email = 'organizador@arenaarena.com';
    SELECT id INTO assistant_user_id FROM users WHERE email = 'assistente@arenaarena.com';
    
    FOR event_record IN SELECT id FROM events LOOP
        -- Admin for all events
        INSERT INTO event_organizers (event_id, user_id, role)
        VALUES (event_record.id, admin_user_id, 'ADMIN');
        
        -- Organizer for most events
        IF random() < 0.8 THEN
            INSERT INTO event_organizers (event_id, user_id, role)
            VALUES (event_record.id, organizer_user_id, 'ORGANIZER');
        END IF;
        
        -- Assistant for some events
        IF random() < 0.6 THEN
            INSERT INTO event_organizers (event_id, user_id, role)
            VALUES (event_record.id, assistant_user_id, 'ASSISTANT');
        END IF;
    END LOOP;
END $$;

-- ORGANIZERS
INSERT INTO organizers (name, phone, email, pix_key, default_commission_rate, active) VALUES
('Carlos Martins', '11 99887-7665', 'carlos@arenaarena.com', 'carlos@pixkey.com', 15.00, true),
('Ana Teresa Silveira', '11 97765-4321', 'anateresa@gmail.com', '123.456.789-10', 12.50, true),
('Rafael Prado Eventos', '21 98765-4321', 'rafael@pradoeventos.com.br', 'rafael@pixkey.com', 20.00, true),
('Mariana Costa', '11 91234-5678', 'mariana.costa@outlook.com', '987.654.321-00', 10.00, true),
('Eventos Profissionais Ltda', '19 98877-6655', 'contato@eventospro.com.br', '45.678.901/0001-23', 25.00, true);

-- Associate organizers with events
UPDATE events SET 
  organizer_id = (SELECT id FROM organizers ORDER BY random() LIMIT 1),
  organizer_commission_rate = (SELECT default_commission_rate FROM organizers ORDER BY random() LIMIT 1)
WHERE random() < 0.8; -- 80% of events will have organizers

-- Add some participant birth dates and pix payment data for the workflow
ALTER TABLE participants ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS pix_payment_code TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS pix_qrcode_url TEXT;

-- Update participant records with birth dates (ages between 18-65)
UPDATE participants 
SET birth_date = CURRENT_DATE - ((18 + floor(random() * 47))::int * interval '1 year' + (floor(random() * 365)::int * interval '1 day'));

-- Add PIX data to some confirmed payments
UPDATE participants
SET 
  pix_payment_code = 'pix' || id::text,
  pix_qrcode_url = 'https://chart.googleapis.com/chart?cht=qr&chl=pixcode' || id::text || '&chs=300x300'
WHERE payment_status = 'CONFIRMED';

-- TOURNAMENT MATCHES for past tournaments
DO $$
DECLARE
    tournament_record RECORD;
    event_participants UUID[]; -- Changed from TEXT[] to UUID[]
    num_participants INTEGER;
    num_rounds INTEGER;
    court_ids UUID[];
    selected_court UUID;
    match_date TIMESTAMP;
    i INTEGER;
    j INTEGER;
    position INTEGER;
    team1_id UUID[] DEFAULT NULL;
    team2_id UUID[] DEFAULT NULL;
    winner TEXT;
    score1 INTEGER;
    score2 INTEGER;
BEGIN
    -- Get all tournaments with status FINISHED or STARTED
    FOR tournament_record IN 
        SELECT t.id, t.event_id, t.rounds, t.status, e.date 
        FROM tournaments t
        JOIN events e ON t.event_id = e.id
        WHERE t.status IN ('FINISHED', 'STARTED')
    LOOP
        -- Get participants for this event - store as UUID array directly
        SELECT ARRAY_AGG(id) INTO event_participants 
        FROM participants 
        WHERE event_id = tournament_record.event_id;
        
        -- Get courts for this event
        SELECT ARRAY_AGG(c.id) INTO court_ids
        FROM courts c
        JOIN event_courts ec ON c.id = ec.court_id
        WHERE ec.event_id = tournament_record.event_id;
        
        num_participants := array_length(event_participants, 1);
        num_rounds := tournament_record.rounds;
        match_date := tournament_record.date::timestamp;
        
        -- Create first round matches
        FOR i IN 0..(2^(num_rounds-1)-1) LOOP
            -- Select participants for this match
            IF 2*i < num_participants THEN
                team1_id := ARRAY[event_participants[2*i+1]];
            ELSE
                team1_id := NULL;
            END IF;
            
            IF 2*i+1 < num_participants THEN
                team2_id := ARRAY[event_participants[2*i+2]];
            ELSE
                team2_id := NULL;
            END IF;
            
            -- For FINISHED tournaments, set scores and winner
            IF tournament_record.status = 'FINISHED' THEN
                IF team1_id IS NOT NULL AND team2_id IS NOT NULL THEN
                    IF random() < 0.5 THEN
                        score1 := 6;
                        score2 := floor(random() * 4)::integer;
                        winner := 'team1';
                    ELSE
                        score1 := floor(random() * 4)::integer;
                        score2 := 6;
                        winner := 'team2';
                    END IF;
                ELSIF team1_id IS NOT NULL THEN
                    score1 := 6;
                    score2 := 0;
                    winner := 'team1';
                ELSIF team2_id IS NOT NULL THEN
                    score1 := 0;
                    score2 := 6;
                    winner := 'team2';
                END IF;
            ELSE
                score1 := NULL;
                score2 := NULL;
                winner := NULL;
            END IF;
            
            -- Get a random court
            IF array_length(court_ids, 1) > 0 THEN
                selected_court := court_ids[floor(random() * array_length(court_ids, 1) + 1)];
            ELSE
                selected_court := NULL;
            END IF;
            
            -- Insert the match
            INSERT INTO tournament_matches (
                tournament_id, event_id, round, position, team1, team2, 
                score1, score2, winner_id, completed, scheduled_time, court_id
            )
            VALUES (
                tournament_record.id, 
                tournament_record.event_id, 
                1, -- first round
                i+1, 
                team1_id, 
                team2_id,
                score1,
                score2,
                winner,
                tournament_record.status = 'FINISHED' OR (tournament_record.status = 'STARTED' AND random() < 0.7),
                match_date + ((i % 4) * interval '2 hours'),
                selected_court
            );
        END LOOP;
        
        -- Create subsequent rounds (empty for CREATED, partially filled for STARTED, filled for FINISHED)
        FOR i IN 2..num_rounds LOOP
            position := 1;
            FOR j IN 1..2^(num_rounds-i) LOOP
                -- For FINISHED tournaments, all rounds have matches
                -- For STARTED tournaments, some later rounds might be empty
                IF tournament_record.status = 'FINISHED' OR (tournament_record.status = 'STARTED' AND i <= 2) THEN
                    -- In a real tournament, these would be winners from previous rounds
                    -- For simplicity, we'll just add random participants
                    IF random() < 0.8 AND num_participants > 0 THEN
                        team1_id := ARRAY[event_participants[floor(random() * num_participants) + 1]];
                    ELSE
                        team1_id := NULL;
                    END IF;
                    
                    IF random() < 0.8 AND num_participants > 0 THEN
                        team2_id := ARRAY[event_participants[floor(random() * num_participants) + 1]];
                    ELSE
                        team2_id := NULL;
                    END IF;
                    
                    -- For FINISHED tournaments and completed matches in STARTED tournaments
                    IF tournament_record.status = 'FINISHED' OR (tournament_record.status = 'STARTED' AND random() < 0.5) THEN
                        IF team1_id IS NOT NULL AND team2_id IS NOT NULL THEN
                            IF random() < 0.5 THEN
                                score1 := 6;
                                score2 := floor(random() * 4)::integer;
                                winner := 'team1';
                            ELSE
                                score1 := floor(random() * 4)::integer;
                                score2 := 6;
                                winner := 'team2';
                            END IF;
                        ELSIF team1_id IS NOT NULL THEN
                            score1 := 6;
                            score2 := 0;
                            winner := 'team1';
                        ELSIF team2_id IS NOT NULL THEN
                            score1 := 0;
                            score2 := 6;
                            winner := 'team2';
                        END IF;
                    ELSE
                        score1 := NULL;
                        score2 := NULL;
                        winner := NULL;
                    END IF;
                ELSE
                    team1_id := NULL;
                    team2_id := NULL;
                    score1 := NULL;
                    score2 := NULL;
                    winner := NULL;
                END IF;
                
                -- Get a random court
                IF array_length(court_ids, 1) > 0 THEN
                    selected_court := court_ids[floor(random() * array_length(court_ids, 1) + 1)];
                ELSE
                    selected_court := NULL;
                END IF;
                
                -- Insert the match
                INSERT INTO tournament_matches (
                    tournament_id, event_id, round, position, team1, team2, 
                    score1, score2, winner_id, completed, scheduled_time, court_id
                )
                VALUES (
                    tournament_record.id, 
                    tournament_record.event_id, 
                    i, 
                    position, 
                    team1_id, 
                    team2_id,
                    score1,
                    score2,
                    winner,
                    (tournament_record.status = 'FINISHED') OR 
                    (tournament_record.status = 'STARTED' AND team1_id IS NOT NULL AND team2_id IS NOT NULL AND random() < 0.3),
                    match_date + ((position-1) * interval '30 minutes') + ((i-1) * interval '1 day'),
                    selected_court
                );
                
                position := position + 1;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- COURT RESERVATIONS
-- Create some court reservations for upcoming events
DO $$
DECLARE
    court_record RECORD;
    event_record RECORD;
    reservation_date DATE;
    start_hour INTEGER;
    reservation_count INTEGER;
    i INTEGER;
BEGIN
    -- For each court
    FOR court_record IN SELECT * FROM courts LOOP
        -- Create 10-20 reservations per court (some for events, some general)
        reservation_count := floor(random() * 11) + 10;
        
        FOR i IN 1..reservation_count LOOP
            -- Select a random date in the next 30 days
            reservation_date := CURRENT_DATE + (floor(random() * 30) + 1) * INTERVAL '1 day';
            -- Random start hour between 8 and 20
            start_hour := floor(random() * 13) + 8;
            
            -- 40% chance to be associated with an event
            IF random() < 0.4 THEN
                -- Select a random upcoming event
                SELECT id INTO event_record FROM events 
                WHERE date >= CURRENT_DATE
                ORDER BY random() LIMIT 1;
                
                IF event_record.id IS NOT NULL THEN
                    INSERT INTO court_reservations (
                        court_id, event_id, start_time, end_time, title, description
                    )
                    VALUES (
                        court_record.id,
                        event_record.id,
                        (reservation_date + (start_hour * INTERVAL '1 hour'))::timestamp,
                        (reservation_date + ((start_hour + 2) * INTERVAL '1 hour'))::timestamp,
                        'Evento: ' || (SELECT title FROM events WHERE id = event_record.id),
                        'Reserva para evento oficial'
                    );
                END IF;
            ELSE
                -- General reservation
                INSERT INTO court_reservations (
                    court_id, start_time, end_time, title, description
                )
                VALUES (
                    court_record.id,
                    (reservation_date + (start_hour * INTERVAL '1 hour'))::timestamp,
                    (reservation_date + ((start_hour + 1) * INTERVAL '1 hour'))::timestamp,
                    'Reserva #' || floor(random() * 1000),
                    CASE floor(random() * 3)
                        WHEN 0 THEN 'Aula particular'
                        WHEN 1 THEN 'Jogo amistoso'
                        ELSE 'Treinamento'
                    END
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;
