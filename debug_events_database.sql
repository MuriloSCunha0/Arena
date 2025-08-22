-- Script para diagnóstico completo de eventos
-- Execute este script no Supabase SQL Editor

-- 1. Ver todos os eventos
SELECT 
    id,
    title,
    status,
    date,
    entry_fee,
    created_at,
    CASE 
        WHEN date > CURRENT_DATE THEN 'FUTURO'
        WHEN date = CURRENT_DATE THEN 'HOJE'
        ELSE 'PASSADO'
    END as temporal_status
FROM events 
ORDER BY created_at DESC;

-- 2. Ver eventos que atendem critérios básicos
SELECT 
    e.id,
    e.title,
    e.status,
    e.date,
    e.entry_fee,
    e.description,
    e.location
FROM events e
WHERE e.status IN ('OPEN', 'PUBLISHED')
  AND e.date > CURRENT_DATE
ORDER BY e.date ASC;

-- 3. Ver torneios associados a eventos
SELECT 
    t.event_id,
    e.title as event_title,
    t.status as tournament_status,
    CASE 
        WHEN t.standings_data IS NULL THEN 'NULL'
        WHEN t.standings_data = '{}' THEN 'VAZIO'
        WHEN jsonb_typeof(t.standings_data) = 'object' AND t.standings_data = '{}' THEN 'OBJETO_VAZIO'
        ELSE 'PREENCHIDO'
    END as standings_status,
    t.created_at as tournament_created
FROM tournaments t
JOIN events e ON e.id = t.event_id
ORDER BY t.created_at DESC;

-- 4. Análise detalhada de disponibilidade
WITH eligible_events AS (
    SELECT 
        e.id,
        e.title,
        e.status,
        e.date,
        e.entry_fee
    FROM events e
    WHERE e.status IN ('OPEN', 'PUBLISHED')
      AND e.date > CURRENT_DATE
),
tournament_check AS (
    SELECT 
        ee.*,
        t.event_id as has_tournament,
        t.standings_data,
        CASE 
            WHEN t.event_id IS NULL THEN 'SEM_TORNEIO'
            WHEN t.standings_data IS NULL OR t.standings_data = '{}' THEN 'TORNEIO_NAO_INICIADO'
            ELSE 'TORNEIO_INICIADO'
        END as tournament_status
    FROM eligible_events ee
    LEFT JOIN tournaments t ON t.event_id = ee.id
)
SELECT 
    *,
    CASE 
        WHEN tournament_status IN ('SEM_TORNEIO', 'TORNEIO_NAO_INICIADO') THEN 'DISPONIVEL'
        ELSE 'NAO_DISPONIVEL'
    END as final_availability
FROM tournament_check
ORDER BY date ASC;

-- 5. Verificar último evento criado
SELECT 
    e.*,
    t.event_id as tournament_exists,
    t.standings_data,
    t.status as tournament_status
FROM events e
LEFT JOIN tournaments t ON t.event_id = e.id
ORDER BY e.created_at DESC
LIMIT 5;
