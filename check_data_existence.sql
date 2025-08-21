-- Verificação básica dos dados para identificar se há dados nas tabelas
-- Execute este script no seu banco de dados

-- 1. Contar registros em cada tabela
SELECT 'events' as tabela, COUNT(*) as total FROM events
UNION ALL
SELECT 'participants' as tabela, COUNT(*) as total FROM participants
UNION ALL
SELECT 'financial_transactions' as tabela, COUNT(*) as total FROM financial_transactions;

-- 2. Verificar se há eventos publicados/ativos
SELECT 
    'eventos_ativos' as info,
    COUNT(*) as total,
    string_agg(DISTINCT status::text, ', ') as status_encontrados
FROM events 
WHERE status IN ('PUBLISHED', 'OPEN', 'IN_PROGRESS', 'COMPLETED');

-- 3. Verificar últimos eventos criados
SELECT 
    'ultimos_eventos' as info,
    id,
    title,
    type,
    date,
    entry_fee,
    status,
    current_participants,
    created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Verificar participantes recentes
SELECT 
    'participantes_recentes' as info,
    COUNT(*) as total,
    string_agg(DISTINCT payment_status::text, ', ') as payment_status_encontrados
FROM participants;

-- 5. Verificar últimas transações
SELECT 
    'ultimas_transacoes' as info,
    COUNT(*) as total,
    string_agg(DISTINCT type::text, ', ') as tipos_encontrados
FROM financial_transactions;
