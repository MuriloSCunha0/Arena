-- SQL para analisar estrutura dos dados de torneios
-- Execute este SQL no Supabase para verificar os dados disponíveis

-- 1. Verificar eventos disponíveis
SELECT 
    'EVENTOS' as tabela,
    id,
    title,
    status,
    current_participants,
    date,
    location
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verificar se há torneios associados aos eventos
SELECT 
    'TOURNAMENTS' as tabela,
    t.id as tournament_id,
    t.event_id,
    e.title as event_title,
    t.status,
    t.format,
    t.current_round,
    t.total_rounds,
    t.groups_count,
    CASE 
        WHEN t.standings_data IS NOT NULL THEN 'SIM'
        ELSE 'NÃO'
    END as tem_standings_data,
    CASE 
        WHEN t.groups_data IS NOT NULL THEN 'SIM'
        ELSE 'NÃO'
    END as tem_groups_data,
    CASE 
        WHEN t.matches_data IS NOT NULL THEN 'SIM'
        ELSE 'NÃO'
    END as tem_matches_data,
    CASE 
        WHEN t.brackets_data IS NOT NULL THEN 'SIM'
        ELSE 'NÃO'
    END as tem_brackets_data,
    CASE 
        WHEN t.teams_data IS NOT NULL THEN 'SIM'
        ELSE 'NÃO'
    END as tem_teams_data
FROM tournaments t
JOIN events e ON t.event_id = e.id
ORDER BY t.created_at DESC
LIMIT 5;

-- 3. Verificar participantes dos eventos
SELECT 
    'PARTICIPANTS' as tabela,
    p.event_id,
    e.title as event_title,
    COUNT(*) as total_participantes,
    COUNT(CASE WHEN p.partner_name IS NOT NULL THEN 1 END) as com_parceiro,
    COUNT(CASE WHEN p.team_name IS NOT NULL THEN 1 END) as com_nome_equipe,
    COUNT(CASE WHEN p.matches_played > 0 THEN 1 END) as com_jogos_realizados
FROM participants p
JOIN events e ON p.event_id = e.id
GROUP BY p.event_id, e.title
ORDER BY total_participantes DESC
LIMIT 5;

-- 4. Exemplo detalhado de um torneio específico (pegar o primeiro disponível)
WITH primeiro_torneio AS (
    SELECT id as event_id 
    FROM events 
    WHERE status = 'active' OR status = 'em_andamento'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'DETALHES_TORNEIO' as secao,
    json_build_object(
        'event_info', json_build_object(
            'id', e.id,
            'title', e.title,
            'status', e.status,
            'participants_count', e.current_participants
        ),
        'tournament_info', json_build_object(
            'id', t.id,
            'status', t.status,
            'format', t.format,
            'current_round', t.current_round,
            'total_rounds', t.total_rounds,
            'groups_count', t.groups_count
        ),
        'data_availability', json_build_object(
            'standings_data', CASE WHEN t.standings_data IS NOT NULL THEN 'DISPONÍVEL' ELSE 'VAZIO' END,
            'groups_data', CASE WHEN t.groups_data IS NOT NULL THEN 'DISPONÍVEL' ELSE 'VAZIO' END,
            'matches_data', CASE WHEN t.matches_data IS NOT NULL THEN 'DISPONÍVEL' ELSE 'VAZIO' END,
            'brackets_data', CASE WHEN t.brackets_data IS NOT NULL THEN 'DISPONÍVEL' ELSE 'VAZIO' END,
            'teams_data', CASE WHEN t.teams_data IS NOT NULL THEN 'DISPONÍVEL' ELSE 'VAZIO' END
        )
    ) as dados_completos
FROM primeiro_torneio pt
JOIN events e ON e.id = pt.event_id
LEFT JOIN tournaments t ON t.event_id = e.id;

-- 5. Se houver dados JSON, mostrar uma amostra da estrutura
WITH torneio_com_dados AS (
    SELECT 
        t.id,
        t.event_id,
        e.title,
        t.standings_data,
        t.groups_data,
        t.matches_data,
        t.brackets_data,
        t.teams_data
    FROM tournaments t
    JOIN events e ON t.event_id = e.id
    WHERE t.standings_data IS NOT NULL 
       OR t.groups_data IS NOT NULL 
       OR t.matches_data IS NOT NULL
    LIMIT 1
)
SELECT 
    'AMOSTRA_DADOS_JSON' as secao,
    json_build_object(
        'tournament_id', id,
        'event_title', title,
        'standings_data_sample', 
            CASE 
                WHEN standings_data IS NOT NULL THEN 
                    CASE 
                        WHEN jsonb_typeof(standings_data) = 'object' THEN jsonb_object_keys(standings_data)
                        WHEN jsonb_typeof(standings_data) = 'array' THEN jsonb_array_length(standings_data)::text
                        ELSE standings_data::text
                    END
                ELSE 'VAZIO'
            END,
        'groups_data_sample',
            CASE 
                WHEN groups_data IS NOT NULL THEN 
                    CASE 
                        WHEN jsonb_typeof(groups_data) = 'object' THEN jsonb_object_keys(groups_data)
                        WHEN jsonb_typeof(groups_data) = 'array' THEN jsonb_array_length(groups_data)::text
                        ELSE groups_data::text
                    END
                ELSE 'VAZIO'
            END,
        'matches_data_sample',
            CASE 
                WHEN matches_data IS NOT NULL THEN 
                    CASE 
                        WHEN jsonb_typeof(matches_data) = 'array' THEN 
                            json_build_object(
                                'total_matches', jsonb_array_length(matches_data),
                                'first_match_keys', 
                                    CASE 
                                        WHEN jsonb_array_length(matches_data) > 0 THEN 
                                            (SELECT array_agg(key) FROM jsonb_object_keys(matches_data->0) key)
                                        ELSE '[]'::text[]
                                    END
                            )
                        ELSE matches_data::text
                    END
                ELSE 'VAZIO'
            END
    ) as estrutura_dados
FROM torneio_com_dados;

-- 6. Verificar participantes de um torneio específico
WITH evento_exemplo AS (
    SELECT id as event_id 
    FROM events 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'PARTICIPANTES_DETALHADO' as secao,
    p.id,
    p.name,
    p.partner_name,
    p.team_name,
    p.category,
    p.skill_level,
    p.seed_number,
    p.matches_played,
    p.matches_won,
    p.matches_lost,
    p.sets_won,
    p.sets_lost,
    p.points_scored,
    p.points_against
FROM evento_exemplo ee
JOIN participants p ON p.event_id = ee.event_id
ORDER BY p.seed_number, p.name
LIMIT 10;
