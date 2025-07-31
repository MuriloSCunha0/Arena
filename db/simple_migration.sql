-- ===================================================
-- MIGRAÇÃO SIMPLES - EXECUTE NO PAINEL DO SUPABASE
-- ===================================================
-- Copie e cole cada comando separadamente no SQL Editor do Supabase

-- 1. Adicionar coluna formation_type na tabela test_teams
ALTER TABLE test_teams ADD COLUMN IF NOT EXISTS formation_type varchar(20) DEFAULT 'MANUAL';

-- 2. Adicionar coluna created_at na tabela test_group_teams  
ALTER TABLE test_group_teams ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 3. Recriar view v_test_teams_with_players
DROP VIEW IF EXISTS v_test_teams_with_players;

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
