-- ===================================================
-- SCRIPT DE MIGRAÇÃO - ADICIONAR COLUNAS FALTANTES
-- ===================================================
-- Execute este script para atualizar tabelas existentes com as novas colunas

-- 1. Adicionar coluna formation_type na tabela test_teams (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_teams' 
        AND column_name = 'formation_type'
    ) THEN
        ALTER TABLE test_teams ADD COLUMN formation_type varchar(20) DEFAULT 'MANUAL';
        RAISE NOTICE 'Coluna formation_type adicionada à tabela test_teams';
    ELSE
        RAISE NOTICE 'Coluna formation_type já existe na tabela test_teams';
    END IF;
END $$;

-- 2. Adicionar coluna created_at na tabela test_group_teams (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_group_teams' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE test_group_teams ADD COLUMN created_at timestamptz DEFAULT now();
        RAISE NOTICE 'Coluna created_at adicionada à tabela test_group_teams';
    ELSE
        RAISE NOTICE 'Coluna created_at já existe na tabela test_group_teams';
    END IF;
END $$;

-- 3. Primeiro, verificar se a view atual existe e recriá-la para incluir formation_type
DROP VIEW IF EXISTS v_test_teams_with_players;

-- 4. Recriar a view com a nova coluna formation_type (created_at já existe em test_teams)
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

-- 5. Confirmar que as colunas foram adicionadas e a view foi recriada
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('test_teams', 'test_group_teams')
AND column_name IN ('formation_type', 'created_at')
ORDER BY table_name, column_name;

-- 6. Verificar se a view foi criada corretamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'v_test_teams_with_players'
ORDER BY ordinal_position;

-- Mensagem final
SELECT 'Migração concluída! A coluna formation_type foi adicionada e a view foi recriada.' as status;
