-- Seed file para popular o banco de dados com dados para testes
-- Este script insere uma grande quantidade de dados para testes e demonstração

-- Configurações iniciais
SET timezone = 'America/Sao_Paulo';

-- Funções auxiliares para geração de dados aleatórios
CREATE OR REPLACE FUNCTION random_date(start_date DATE, end_date DATE) RETURNS DATE AS $$
BEGIN
    RETURN start_date + (random() * (end_date - start_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION random_time() RETURNS TIME AS $$
BEGIN
    RETURN (TIMESTAMP '2023-01-01 08:00:00' + random() * INTERVAL '12 hours')::TIME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION random_cpf() RETURNS VARCHAR AS $$
DECLARE
    cpf_base VARCHAR;
    cpf_digits VARCHAR;
BEGIN
    -- Gera 9 dígitos aleatórios
    cpf_base := '';
    FOR i IN 1..9 LOOP
        cpf_base := cpf_base || floor(random() * 10)::INTEGER::VARCHAR;
    END LOOP;
    
    -- Formata com pontos e traço
    RETURN substring(cpf_base from 1 for 3) || '.' || 
           substring(cpf_base from 4 for 3) || '.' || 
           substring(cpf_base from 7 for 3) || '-' || 
           floor(random() * 10)::INTEGER::VARCHAR || floor(random() * 10)::INTEGER::VARCHAR;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION random_phone() RETURNS VARCHAR AS $$
BEGIN
    RETURN '(' || (floor(random() * 90) + 10)::VARCHAR || ') 9' || 
           floor(random() * 9000 + 1000)::VARCHAR || '-' || 
           floor(random() * 9000 + 1000)::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- 1. Inserir Usuários (50)
INSERT INTO users (email, user_metadata, app_metadata)
SELECT 
    'user' || n || '@example.com',
    json_build_object(
        'full_name', 'User ' || n,
        'avatar_url', 'https://randomuser.me/api/portraits/' || (CASE WHEN n % 2 = 0 THEN 'men' ELSE 'women' END) || '/' || (n % 70 + 1) || '.jpg'
    ),
    json_build_object(
        'role', (CASE WHEN n % 5 = 0 THEN 'admin' WHEN n % 3 = 0 THEN 'organizer' ELSE 'user' END)
    )
FROM generate_series(1, 50) AS n;

-- 2. Inserir Organizadores (10)
INSERT INTO organizers (name, phone, email, pix_key, default_commission_rate, active)
VALUES
    ('Arena Sports', random_phone(), 'arena@sports.com', 'arena@pix.com', 12.5, true),
    ('Torneios BT', random_phone(), 'bt@torneios.com', 'bt@pix.com', 10, true),
    ('Liga Padel', random_phone(), 'liga@padel.com', 'liga@pix.com', 15, true),
    ('Esporte Total', random_phone(), 'contato@esportetotal.com', 'total@pix.com', 8.5, true),
    ('Areia & Raquete', random_phone(), 'eventos@areia.com', 'areia@pix.com', 11, true),
    ('Quero Jogar', random_phone(), 'eventos@querojogar.com', 'quero@pix.com', 10, true),
    ('Beach Pro', random_phone(), 'pro@beachtennis.com', 'beach@pix.com', 13.5, true),
    ('Clube Esportivo', random_phone(), 'clube@esportivo.com', 'clube@pix.com', 9, true),
    ('Arena Prime', random_phone(), 'contato@prime.com', 'prime@pix.com', 12, true),
    ('Torneios Gold', random_phone(), 'gold@torneios.com', 'gold@pix.com', 14, false);

-- 3. Inserir Quadras (30) - MODIFICADO para evitar erro de conversão UUID->integer
INSERT INTO courts (name, location, type, status, surface, indoor, active, description)
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
    n % 15 != 0,
    CASE 
        WHEN n % 3 = 0 THEN 'Quadra de areia com medidas oficiais para competições de Beach Tennis.'
        WHEN n % 3 = 1 THEN 'Quadra de Padel com paredes de vidro e iluminação de alta qualidade.'
        ELSE 'Quadra multiuso que pode ser adaptada para diferentes modalidades esportivas.'
    END
FROM generate_series(1, 30) AS n;

-- Atualizar alguns URLs das imagens - MODIFICADO para evitar conversão UUID->integer
UPDATE courts 
SET image_url = 'https://placekitten.com/800/' || (500 + abs(('x' || md5(id::text))::bit(32)::integer % 300))
WHERE abs(('x' || md5(id::text))::bit(32)::integer) % 3 = 0;

-- 4. Inserir Eventos (50) - MODIFICADO função onde usamos id::text::integer
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
    random_date('2023-01-01'::date, '2024-12-31'::date),
    random_time(),
    (50 + (random() * 150)::integer)::decimal(10,2),
    16 * power(2, n % 4), -- 16, 32, 64 ou 128 participantes
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
    (SELECT ARRAY_AGG(id) FROM courts ORDER BY random() LIMIT (3 + n % 5)),
    (SELECT id FROM organizers ORDER BY random() LIMIT 1),
    (7.5 + (random() * 10)::integer)::decimal(5,2),
    CASE 
        WHEN random_date('2023-01-01'::date, '2023-12-31'::date) < CURRENT_DATE THEN 
            (CASE 
                WHEN random() < 0.6 THEN 'COMPLETED'
                WHEN random() < 0.8 THEN 'CANCELLED'
                ELSE 'ONGOING'
            END)::event_status
        WHEN random_date('2023-01-01'::date, '2023-03-31'::date) < CURRENT_DATE THEN 'ONGOING'::event_status
        ELSE 'SCHEDULED'::event_status
    END
FROM generate_series(1, 50) AS n;

-- Adicionar URLs de banner para alguns eventos - MODIFICADO
UPDATE events 
SET banner_image_url = 'https://picsum.photos/1200/' || (500 + abs(('x' || md5(id::text))::bit(32)::integer % 300))
WHERE abs(('x' || md5(id::text))::bit(32)::integer) % 4 = 0;

-- 5. Inserir Event-Courts (relacionamentos entre eventos e quadras) - MODIFICADO para evitar duplicatas
INSERT INTO event_courts (event_id, court_id)
SELECT DISTINCT e.id, c.id
FROM events e
CROSS JOIN LATERAL (
    SELECT id FROM courts 
    WHERE id = ANY(e.court_ids)
    ORDER BY id -- Adicionada ordenação para garantir consistência
    LIMIT 3
) c
ON CONFLICT (event_id, court_id) DO NOTHING; -- Adicionado para ignorar duplicatas

-- 6. Inserir Event Organizers (relacionamentos entre eventos e organizadores) - MODIFICADO
INSERT INTO event_organizers (event_id, user_id, role, permissions)
SELECT 
    e.id,
    u.id,
    CASE 
        WHEN abs(('x' || md5(u.id::text))::bit(32)::integer) % 5 = 0 THEN 'ADMIN'
        WHEN abs(('x' || md5(u.id::text))::bit(32)::integer) % 3 = 0 THEN 'ORGANIZER'
        ELSE 'ASSISTANT'
    END::organizer_role,
    json_build_object(
        'can_edit', abs(('x' || md5(u.id::text))::bit(32)::integer) % 3 = 0,
        'can_delete', abs(('x' || md5(u.id::text))::bit(32)::integer) % 5 = 0,
        'can_manage_participants', true
    )
FROM events e
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE (app_metadata->>'role') IN ('admin', 'organizer')
    ORDER BY random()
    LIMIT (1 + abs(('x' || md5(e.id::text))::bit(32)::integer) % 3)
) u;

-- 7. Inserir Participantes (800) - MODIFICADO para resolver referência ambígua de partner_id
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
    current_partner_id UUID; -- Renomeado para evitar a ambiguidade
    participant_id UUID;
    partner_count INTEGER := 0;
    rand FLOAT;
    event_hash INTEGER;
BEGIN
    -- Para cada evento
    FOR event_record IN SELECT * FROM events LOOP
        -- Calcula um hash seguro para ID do evento para operações matemáticas
        event_hash := abs(('x' || md5(event_record.id::text))::bit(32)::integer) % 1000;
        
        -- Define número de participantes para este evento (entre 16 e max_participants)
        max_participants := LEAST(event_record.max_participants, 64); -- limita a 64 para não gerar muitos dados
        num_participants := GREATEST(min_participants, (random() * (max_participants - min_participants))::integer + min_participants);
        
        -- Garante que num_participants é par
        IF num_participants % 2 != 0 THEN
            num_participants := num_participants + 1;
        END IF;
        
        -- Cria participantes para o evento
        FOR i IN 1..num_participants LOOP
            -- Gera um nome aleatório
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
            
            -- Se o evento é do tipo FORMED, vamos criar parceiros para metade dos participantes
            IF event_record.team_formation = 'FORMED' AND i % 2 = 1 THEN
                -- Guarda ID deste participante para associá-lo como parceiro do próximo
                current_partner_id := participant_id;
                partner_count := partner_count + 1;
            ELSIF event_record.team_formation = 'FORMED' AND i % 2 = 0 AND current_partner_id IS NOT NULL THEN
                -- Atualiza este participante para ter o anterior como parceiro
                UPDATE participants 
                SET partner_id = current_partner_id,
                    partner_name = (SELECT name FROM participants WHERE id = current_partner_id)
                WHERE id = participant_id;
                
                -- Também atualiza o parceiro anterior para apontar para este
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

-- 8. Inserir Torneios para todos os eventos do tipo TOURNAMENT - MODIFICADO para evitar duplicatas
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
        'groupSize', CASE WHEN abs(('x' || md5(id::text))::bit(32)::integer) % 3 = 0 THEN 3 ELSE 4 END,
        'qualifiersPerGroup', 2,
        'eliminationType', CASE WHEN abs(('x' || md5(id::text))::bit(32)::integer) % 5 = 0 THEN 'SINGLE' ELSE 'DOUBLE' END
    ),
    'TOURNAMENT',
    team_formation
FROM events
WHERE type = 'TOURNAMENT'
ON CONFLICT (event_id) DO UPDATE 
SET status = EXCLUDED.status,
    settings = EXCLUDED.settings;

-- 9. Criar Partidas de Torneio para torneios STARTED ou FINISHED - MODIFICADO para corrigir erros de tipo
DO $$
DECLARE
    tournament_record RECORD;
    event_record RECORD;
    participant_records RECORD;
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
    -- Loops por todos os torneios STARTED ou FINISHED
    FOR tournament_record IN 
        SELECT t.*, e.court_ids
        FROM tournaments t
        JOIN events e ON t.event_id = e.id
        WHERE t.status IN ('STARTED', 'FINISHED')
    LOOP
        -- Obter os participantes para o torneio
        participants_array := ARRAY(
            SELECT id FROM participants 
            WHERE event_id = tournament_record.event_id 
            ORDER BY id
        );
        
        registered_participants := array_length(participants_array, 1);
        
        -- Se há poucos participantes, continue para o próximo torneio
        IF registered_participants < 8 THEN
            CONTINUE;
        END IF;
        
        -- Inicializar array de times
        team_array := ARRAY[]::UUID[][];
        
        IF tournament_record.team_formation = 'FORMED' THEN
            -- Para FORMED, pegar parceiros já definidos
            FOR participant_records IN 
                SELECT p.id, p.partner_id
                FROM participants p
                WHERE p.event_id = tournament_record.event_id
                AND p.partner_id IS NOT NULL
                AND p.id < p.partner_id -- Evita duplicação
            LOOP
                -- Criar time com os dois participantes e adicionar ao array
                temp_team := ARRAY[participant_records.id, participant_records.partner_id];
                team_array := team_array || ARRAY[temp_team];
            END LOOP;
        ELSE
            -- Para RANDOM, criar times aleatoriamente
            FOR i IN 0..((registered_participants/2)-1) LOOP
                -- Verificar se temos participantes suficientes
                IF i*2+2 <= registered_participants THEN
                    -- Criar time com dois participantes e adicionar ao array
                    temp_team := ARRAY[participants_array[i*2+1], participants_array[i*2+2]];
                    team_array := team_array || ARRAY[temp_team];
                END IF;
            END LOOP;
        END IF;
        
        num_teams := array_length(team_array, 1);
        
        -- Verificar se temos times suficientes para continuar
        IF num_teams < 4 THEN  -- Precisamos de pelo menos 4 times para fazer um torneio significativo
            CONTINUE;
        END IF;
        
        num_groups := GREATEST(2, num_teams / (tournament_record.settings->>'groupSize')::integer);
        matches_per_group := (((tournament_record.settings->>'groupSize')::integer) * ((tournament_record.settings->>'groupSize')::integer - 1)) / 2;
        
        -- Obter quadras para agendar partidas
        SELECT ARRAY_AGG(c.id)
        INTO court_ids
        FROM courts c
        WHERE c.id = ANY(tournament_record.court_ids);
        
        -- Se não há quadras disponíveis, use uma quadra padrão
        IF court_ids IS NULL OR array_length(court_ids, 1) = 0 THEN
            SELECT ARRAY_AGG(id) INTO court_ids FROM courts WHERE status = 'AVAILABLE' LIMIT 3;
        END IF;
        
        -- Data base para agendamento das partidas
        SELECT date + time INTO schedule_base FROM events WHERE id = tournament_record.event_id;
        
        -- Criar partidas da fase de grupos
        current_court := 1;
        
        -- Para cada grupo
        FOR group_number IN 1..num_groups LOOP
            -- Para cada possível combinação de times no grupo
            FOR i IN 1..((tournament_record.settings->>'groupSize')::integer-1) LOOP
                FOR j IN i+1..((tournament_record.settings->>'groupSize')::integer) LOOP
                    -- Obter times deste grupo
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
                    
                    -- Agendar a partida
                    court_id := court_ids[(current_court % array_length(court_ids, 1)) + 1];
                    scheduled_time := schedule_base + (((group_number-1) * matches_per_group + (i-1)*(tournament_record.settings->>'groupSize')::integer-i*(i-1)/2+j-i-1)) * interval '1 hour');
                    
                    -- Para torneios FINISHED, todas as partidas estão completas
                    -- Para torneios STARTED, algumas partidas estão completas
                    IF tournament_record.status = 'FINISHED' OR random() < 0.8 THEN
                        completed := TRUE;
                        score1 := (random() * 20)::integer + 10;
                        score2 := (random() * 20)::integer + 10;
                        -- Garantir que não há empate
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
                    
                    -- Inserir partida
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
        
        -- Se o torneio estiver FINISHED, adicionar partidas de fase eliminatória
        IF tournament_record.status = 'FINISHED' THEN
            -- Simplificação: Adicionar 2 rounds de partidas eliminatórias (quartas e semi)
            -- Round 1 - quartas
            FOR i IN 1..4 LOOP
                -- Verificar se há times suficientes
                IF i <= num_teams AND i+4 <= num_teams THEN
                    -- Obter times para a partida
                    team1 := team_array[i];
                    team2 := team_array[i+4];
                    
                    scheduled_time := schedule_base + ((num_groups * matches_per_group) + i) * interval '1 hour';
                    court_id := court_ids[(i % array_length(court_ids, 1)) + 1];
                    
                    -- Adicionar partida
                    score1 := (random() * 20)::integer + 10;
                    score2 := (random() * 20)::integer + 10;
                    -- Garantir que não há empate
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
            
            -- Round 2 - semi
            FOR i IN 1..2 LOOP
                -- Verificar se há times suficientes
                IF i*2-1 <= num_teams AND i*2 <= num_teams THEN
                    scheduled_time := schedule_base + ((num_groups * matches_per_group) + 4 + i) * interval '1 hour';
                    court_id := court_ids[(i % array_length(court_ids, 1)) + 1];
                    
                    -- Obter times para a partida
                    team1 := team_array[i*2-1];
                    team2 := team_array[i*2];
                    
                    -- Simplificado: A partida está completa
                    score1 := (random() * 20)::integer + 10;
                    score2 := (random() * 20)::integer + 10;
                    -- Garantir que não há empate
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
            
            -- Final
            IF num_teams >= 2 THEN
                scheduled_time := schedule_base + ((num_groups * matches_per_group) + 7) * interval '1 hour';
                court_id := court_ids[1];
                
                -- Obter times para a final
                team1 := team_array[1];
                team2 := team_array[2];
                
                score1 := (random() * 20)::integer + 10;
                score2 := (random() * 20)::integer + 10;
                -- Garantir que não há empate
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

-- 10. Criar Resultados para Participantes
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
AND random() < 0.8; -- Apenas para alguns participantes, não todos

-- 11. Criar Reservas de Quadras relacionadas a partidas
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
WHERE m.court_id IS NOT NULL AND m.scheduled_time IS NOT NULL;

-- 12. Adicionar algumas reservas de quadras não relacionadas a partidas
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
LIMIT 50;

-- 13. Criar Transações Financeiras para pagamentos de participantes - MODIFICADO para evitar nulls no payment_method
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
    COALESCE(p.payment_method, 'OTHER')::payment_method, -- Adiciona valor padrão para evitar nulls
    p.payment_status,
    p.payment_date
FROM participants p
JOIN events e ON p.event_id = e.id
WHERE p.payment_status = 'CONFIRMED'
AND p.payment_date IS NOT NULL;

-- 14. Adicionar outras transações financeiras (despesas variadas)
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
LIMIT 100;

-- Limpeza
DROP FUNCTION IF EXISTS random_date;
DROP FUNCTION IF EXISTS random_time;
DROP FUNCTION IF EXISTS random_cpf;
DROP FUNCTION IF EXISTS random_phone;
