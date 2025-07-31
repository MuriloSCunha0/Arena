-- ===================================================
-- SCHEMA PARA AMBIENTE DE TESTE DE TORNEIOS
-- ===================================================

-- Tabela principal para torneios de teste
CREATE TABLE test_tournaments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    category varchar(100) NOT NULL,
    description text,
    stage varchar(20) DEFAULT 'SETUP' CHECK (stage IN ('SETUP', 'GROUP_STAGE', 'ELIMINATION')),
    status varchar(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'STARTED', 'COMPLETED')),
    settings jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Participantes dos torneios de teste
CREATE TABLE test_participants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    email varchar(255),
    phone varchar(20),
    cpf varchar(14),
    category varchar(50) DEFAULT 'OPEN',
    user_id uuid, -- Referência ao usuário real (opcional)
    partner_id uuid REFERENCES test_participants(id), -- Para duplas pré-formadas
    payment_status varchar(20) DEFAULT 'PENDING',
    registered_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Duplas/equipes formadas no torneio
CREATE TABLE test_teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
    name varchar(255), -- Nome da dupla (opcional)
    player1_id uuid NOT NULL REFERENCES test_participants(id) ON DELETE CASCADE,
    player2_id uuid NOT NULL REFERENCES test_participants(id) ON DELETE CASCADE,
    seed_number int, -- Cabeça de chave
    is_bye boolean DEFAULT false, -- Se recebeu BYE
    formation_type varchar(20) DEFAULT 'MANUAL', -- MANUAL, AUTO, RANDOM
    created_at timestamptz DEFAULT now(),
    UNIQUE(tournament_id, player1_id, player2_id)
);

-- Grupos da fase de grupos
CREATE TABLE test_groups (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
    group_number int NOT NULL,
    group_name varchar(50), -- Ex: "Grupo A", "Grupo 1"
    max_teams int DEFAULT 4,
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    UNIQUE(tournament_id, group_number)
);

-- Relação entre duplas e grupos
CREATE TABLE test_group_teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id uuid NOT NULL REFERENCES test_groups(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES test_teams(id) ON DELETE CASCADE,
    position int, -- Posição no grupo (para seeding)
    created_at timestamptz DEFAULT now(),
    UNIQUE(group_id, team_id)
);

-- Partidas (grupos e eliminatórias)
CREATE TABLE test_matches (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
    team1_id uuid REFERENCES test_teams(id),
    team2_id uuid REFERENCES test_teams(id),
    winner_id uuid REFERENCES test_teams(id),
    
    -- Informações da partida
    stage varchar(20) NOT NULL CHECK (stage IN ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINALS', 'ELIMINATION')),
    round_number int DEFAULT 1,
    match_number int, -- Número da partida na rodada
    position int, -- Posição no bracket
    
    -- Grupo (para fase de grupos)
    group_id uuid REFERENCES test_groups(id),
    
    -- Resultados
    score1 int,
    score2 int,
    sets_score jsonb, -- Para esportes com sets: {"team1": [6,4], "team2": [4,6]}
    games_score jsonb, -- Detalhamento de games por set
    completed boolean DEFAULT false,
    walkover boolean DEFAULT false,
    forfeit boolean DEFAULT false,
    
    -- Agendamento
    court_name varchar(100),
    scheduled_time timestamptz,
    actual_start_time timestamptz,
    actual_end_time timestamptz,
    
    -- Referências para bracket eliminatório
    parent_match1_id uuid REFERENCES test_matches(id), -- Partida que alimenta team1
    parent_match2_id uuid REFERENCES test_matches(id), -- Partida que alimenta team2
    next_match_id uuid REFERENCES test_matches(id), -- Próxima partida para o vencedor
    
    -- Metadados
    notes text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Classificação e estatísticas por grupo
CREATE TABLE test_group_standings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id uuid NOT NULL REFERENCES test_groups(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES test_teams(id) ON DELETE CASCADE,
    
    -- Estatísticas básicas
    matches_played int DEFAULT 0,
    wins int DEFAULT 0,
    losses int DEFAULT 0,
    draws int DEFAULT 0,
    
    -- Estatísticas específicas do Beach Tennis
    games_won int DEFAULT 0,
    games_lost int DEFAULT 0,
    game_difference int DEFAULT 0,
    
    -- Sets (para esportes com sets)
    sets_won int DEFAULT 0,
    sets_lost int DEFAULT 0,
    set_difference int DEFAULT 0,
    
    -- Classificação
    points int DEFAULT 0,
    position int,
    qualified boolean DEFAULT false,
    
    -- Critérios de desempate
    head_to_head_wins int DEFAULT 0,
    
    updated_at timestamptz DEFAULT now(),
    UNIQUE(group_id, team_id)
);

-- Bracket eliminatório (estrutura e metadados)
CREATE TABLE test_elimination_brackets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
    bracket_type varchar(20) DEFAULT 'SINGLE' CHECK (bracket_type IN ('SINGLE', 'DOUBLE')),
    total_teams int NOT NULL,
    total_rounds int NOT NULL,
    
    -- Informações sobre BYEs
    byes_count int DEFAULT 0,
    bye_teams jsonb DEFAULT '[]', -- IDs das duplas que receberam BYE
    
    -- Estrutura do bracket
    bracket_structure jsonb NOT NULL, -- Estrutura completa do bracket
    seeding_method varchar(20) DEFAULT 'RANKING', -- RANKING, RANDOM, MANUAL
    
    -- Status
    current_round int DEFAULT 1,
    completed boolean DEFAULT false,
    
    -- Metadados
    generation_method varchar(50), -- 'smart_bye', 'standard', etc.
    generation_settings jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Histórico de ações e logs do torneio
CREATE TABLE test_tournament_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
    action varchar(100) NOT NULL,
    description text,
    actor varchar(100) DEFAULT 'SYSTEM',
    details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- ===================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ===================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_test_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER update_test_tournaments_updated_at BEFORE UPDATE ON test_tournaments FOR EACH ROW EXECUTE FUNCTION update_test_updated_at_column();
CREATE TRIGGER update_test_matches_updated_at BEFORE UPDATE ON test_matches FOR EACH ROW EXECUTE FUNCTION update_test_updated_at_column();
CREATE TRIGGER update_test_group_standings_updated_at BEFORE UPDATE ON test_group_standings FOR EACH ROW EXECUTE FUNCTION update_test_updated_at_column();
CREATE TRIGGER update_test_elimination_brackets_updated_at BEFORE UPDATE ON test_elimination_brackets FOR EACH ROW EXECUTE FUNCTION update_test_updated_at_column();

-- ===================================================
-- ÍNDICES PARA PERFORMANCE
-- ===================================================

-- Índices principais
CREATE INDEX idx_test_participants_tournament_id ON test_participants(tournament_id);
CREATE INDEX idx_test_teams_tournament_id ON test_teams(tournament_id);
CREATE INDEX idx_test_groups_tournament_id ON test_groups(tournament_id);
CREATE INDEX idx_test_matches_tournament_id ON test_matches(tournament_id);
CREATE INDEX idx_test_matches_stage ON test_matches(stage);
CREATE INDEX idx_test_matches_group_id ON test_matches(group_id);
CREATE INDEX idx_test_group_standings_group_id ON test_group_standings(group_id);

-- Índices compostos
CREATE INDEX idx_test_matches_tournament_stage ON test_matches(tournament_id, stage);
CREATE INDEX idx_test_teams_players ON test_teams(player1_id, player2_id);

-- ===================================================
-- VIEWS ÚTEIS
-- ===================================================

-- View para duplas com nomes dos jogadores
CREATE VIEW v_test_teams_with_players AS
SELECT 
    t.id,
    t.tournament_id,
    t.name as team_name,
    t.seed_number,
    t.is_bye,
    t.formation_type,
    t.created_at,
    p1.name as player1_name,
    p2.name as player2_name,
    p1.id as player1_id,
    p2.id as player2_id,
    COALESCE(t.name, p1.name || ' & ' || p2.name) as display_name
FROM test_teams t
JOIN test_participants p1 ON t.player1_id = p1.id
JOIN test_participants p2 ON t.player2_id = p2.id;

-- View para partidas com informações completas
CREATE VIEW v_test_matches_complete AS
SELECT 
    m.*,
    t1.display_name as team1_name,
    t2.display_name as team2_name,
    tw.display_name as winner_name,
    g.group_number,
    g.group_name
FROM test_matches m
LEFT JOIN v_test_teams_with_players t1 ON m.team1_id = t1.id
LEFT JOIN v_test_teams_with_players t2 ON m.team2_id = t2.id
LEFT JOIN v_test_teams_with_players tw ON m.winner_id = tw.id
LEFT JOIN test_groups g ON m.group_id = g.id;

-- View para classificação dos grupos
CREATE VIEW v_test_group_standings_complete AS
SELECT 
    gs.*,
    t.display_name as team_name,
    g.group_number,
    g.group_name,
    CASE 
        WHEN gs.position <= 2 THEN true 
        ELSE false 
    END as qualifies_for_elimination
FROM test_group_standings gs
JOIN v_test_teams_with_players t ON gs.team_id = t.id
JOIN test_groups g ON gs.group_id = g.id
ORDER BY g.group_number, gs.position;

-- ===================================================
-- FUNÇÕES AUXILIARES
-- ===================================================

-- Função para calcular estatísticas de um grupo
CREATE OR REPLACE FUNCTION calculate_test_group_standings(p_group_id uuid)
RETURNS void AS $$
DECLARE
    team_record RECORD;
    match_record RECORD;
    team_stats RECORD;
BEGIN
    -- Para cada dupla no grupo
    FOR team_record IN 
        SELECT DISTINCT team_id FROM test_group_teams WHERE group_id = p_group_id
    LOOP
        -- Calcular estatísticas
        SELECT 
            COUNT(*) as matches_played,
            SUM(CASE WHEN winner_id = team_record.team_id THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN winner_id != team_record.team_id AND completed = true THEN 1 ELSE 0 END) as losses,
            SUM(CASE 
                WHEN team1_id = team_record.team_id THEN COALESCE(score1, 0)
                WHEN team2_id = team_record.team_id THEN COALESCE(score2, 0)
                ELSE 0
            END) as games_won,
            SUM(CASE 
                WHEN team1_id = team_record.team_id THEN COALESCE(score2, 0)
                WHEN team2_id = team_record.team_id THEN COALESCE(score1, 0)
                ELSE 0
            END) as games_lost
        INTO team_stats
        FROM test_matches 
        WHERE group_id = p_group_id 
        AND (team1_id = team_record.team_id OR team2_id = team_record.team_id)
        AND completed = true;
        
        -- Inserir ou atualizar estatísticas
        INSERT INTO test_group_standings (
            group_id, team_id, matches_played, wins, losses,
            games_won, games_lost, game_difference, points
        ) VALUES (
            p_group_id, team_record.team_id, 
            COALESCE(team_stats.matches_played, 0),
            COALESCE(team_stats.wins, 0),
            COALESCE(team_stats.losses, 0),
            COALESCE(team_stats.games_won, 0),
            COALESCE(team_stats.games_lost, 0),
            COALESCE(team_stats.games_won, 0) - COALESCE(team_stats.games_lost, 0),
            COALESCE(team_stats.wins, 0) * 3
        ) ON CONFLICT (group_id, team_id) DO UPDATE SET
            matches_played = EXCLUDED.matches_played,
            wins = EXCLUDED.wins,
            losses = EXCLUDED.losses,
            games_won = EXCLUDED.games_won,
            games_lost = EXCLUDED.games_lost,
            game_difference = EXCLUDED.game_difference,
            points = EXCLUDED.points,
            updated_at = now();
    END LOOP;
    
    -- Atualizar posições baseado nas regras do Beach Tennis
    WITH ranked_teams AS (
        SELECT 
            team_id,
            ROW_NUMBER() OVER (
                ORDER BY 
                    game_difference DESC,
                    games_won DESC,
                    games_lost ASC,
                    wins DESC
            ) as new_position
        FROM test_group_standings 
        WHERE group_id = p_group_id
    )
    UPDATE test_group_standings 
    SET position = rt.new_position,
        qualified = (rt.new_position <= 2)
    FROM ranked_teams rt
    WHERE test_group_standings.group_id = p_group_id 
    AND test_group_standings.team_id = rt.team_id;
END;
$$ LANGUAGE plpgsql;

-- Função para log de ações
CREATE OR REPLACE FUNCTION log_test_tournament_action(
    p_tournament_id uuid,
    p_action varchar(100),
    p_description text DEFAULT NULL,
    p_actor varchar(100) DEFAULT 'SYSTEM',
    p_details jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO test_tournament_logs (tournament_id, action, description, actor, details)
    VALUES (p_tournament_id, p_action, p_description, p_actor, p_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;
