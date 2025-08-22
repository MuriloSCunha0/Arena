-- Diagnóstico completo do problema de eventos disponíveis
-- Execute no Supabase SQL Editor

-- 1. Verificar data atual e eventos
SELECT 
    CURRENT_DATE as data_hoje,
    CURRENT_TIMESTAMP as timestamp_hoje;

-- 2. Análise completa dos eventos
SELECT 
    e.id,
    e.title,
    e.status,
    e.date,
    e.entry_fee,
    e.created_at,
    CASE 
        WHEN e.date > CURRENT_DATE THEN 'FUTURO'
        WHEN e.date = CURRENT_DATE THEN 'HOJE'
        ELSE 'PASSADO'
    END as temporal_status,
    CASE 
        WHEN e.status IN ('OPEN', 'PUBLISHED') THEN 'STATUS_OK'
        ELSE 'STATUS_NOK'
    END as status_check,
    t.id as tournament_id,
    t.status as tournament_status,
    CASE 
        WHEN t.id IS NULL THEN 'SEM_TORNEIO'
        WHEN t.standings_data IS NULL OR t.standings_data = '{}' THEN 'TORNEIO_NAO_INICIADO'
        ELSE 'TORNEIO_INICIADO'
    END as tournament_check,
    CASE 
        WHEN e.status IN ('OPEN', 'PUBLISHED') 
         AND e.date > CURRENT_DATE 
         AND (t.id IS NULL OR t.standings_data IS NULL OR t.standings_data = '{}')
        THEN 'DEVE_APARECER'
        ELSE 'NAO_DEVE_APARECER'
    END as should_appear
FROM events e
LEFT JOIN tournaments t ON t.event_id = e.id
ORDER BY e.created_at DESC;

-- 3. Eventos que deveriam aparecer mas podem estar com status errado
SELECT 
    'Eventos com data futura mas status inadequado' as problema,
    e.id,
    e.title,
    e.status,
    e.date,
    'Precisa status OPEN ou PUBLISHED' as solucao
FROM events e
WHERE e.date > CURRENT_DATE 
  AND e.status NOT IN ('OPEN', 'PUBLISHED')
ORDER BY e.date;

-- 4. Torneios que podem estar bloqueando eventos
SELECT 
    'Torneios iniciados que bloqueiam eventos' as problema,
    e.id,
    e.title,
    e.date,
    t.status,
    jsonb_typeof(t.standings_data) as standings_type,
    CASE 
        WHEN t.standings_data IS NULL THEN 'NULL'
        WHEN t.standings_data = '{}' THEN 'VAZIO'
        ELSE 'PREENCHIDO'
    END as standings_status
FROM events e
JOIN tournaments t ON t.event_id = e.id
WHERE e.date > CURRENT_DATE 
  AND e.status IN ('OPEN', 'PUBLISHED')
  AND t.standings_data IS NOT NULL 
  AND t.standings_data != '{}'
ORDER BY e.date;

-- 5. Query exata que deveria retornar eventos disponíveis
SELECT 
    'Query do ParticipanteService - eventos que deveriam aparecer' as titulo,
    e.id, 
    e.title, 
    e.description, 
    e.location, 
    e.date, 
    e.time, 
    e.entry_fee, 
    e.banner_image_url, 
    e.status
FROM events e
WHERE e.status IN ('OPEN', 'PUBLISHED')
  AND e.date > CURRENT_DATE
ORDER BY e.date ASC;

-- 6. Verificar se há torneios para esses eventos
WITH eventos_elegiveis AS (
    SELECT e.*
    FROM events e
    WHERE e.status IN ('OPEN', 'PUBLISHED')
      AND e.date > CURRENT_DATE
)
SELECT 
    ee.id as event_id,
    ee.title,
    ee.date,
    t.id as tournament_id,
    t.status as tournament_status,
    t.standings_data,
    CASE 
        WHEN t.id IS NULL THEN 'SEM_TORNEIO - DISPONÍVEL'
        WHEN t.standings_data IS NULL OR t.standings_data = '{}' THEN 'TORNEIO_NAO_INICIADO - DISPONÍVEL'
        ELSE 'TORNEIO_INICIADO - NÃO DISPONÍVEL'
    END as availability_status
FROM eventos_elegiveis ee
LEFT JOIN tournaments t ON t.event_id = ee.id
ORDER BY ee.date;
