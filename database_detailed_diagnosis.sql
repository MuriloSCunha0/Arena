-- Script de Teste Específico para Diagnóstico dos Gráficos
-- Verificar exatamente como os dados estão sendo retornados

-- 1. Verificar eventos com todos os campos relevantes
SELECT 
    'EVENTOS_COMPLETOS' as tipo,
    id,
    title,
    type,
    date,
    entry_fee,
    max_participants,
    current_participants,
    status,
    categories,
    created_at
FROM events 
WHERE status IN ('PUBLISHED', 'OPEN', 'IN_PROGRESS', 'COMPLETED')
ORDER BY date DESC
LIMIT 3;

-- 2. Verificar participantes com status de pagamento
SELECT 
    'PARTICIPANTES_STATUS' as tipo,
    p.id,
    p.name,
    p.event_id,
    p.payment_status,
    e.title as event_title
FROM participants p
JOIN events e ON e.id = p.event_id
ORDER BY p.registered_at DESC
LIMIT 5;

-- 3. Verificar transações financeiras com todos os campos
SELECT 
    'TRANSACOES_COMPLETAS' as tipo,
    ft.id,
    ft.event_id,
    ft.participant_id,
    ft.type,
    ft.amount,
    -- Verificar se tem campo status na tabela
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'financial_transactions' 
            AND column_name = 'status'
        ) THEN 'STATUS_FIELD_EXISTS'
        ELSE 'NO_STATUS_FIELD'
    END as status_check,
    ft.description,
    ft.created_at,
    e.title as event_title
FROM financial_transactions ft
JOIN events e ON e.id = ft.event_id
ORDER BY ft.created_at DESC
LIMIT 5;

-- 4. Verificar se existe campo status em financial_transactions
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'financial_transactions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Testar query que simula o que a aplicação faria
SELECT 
    'SIMULACAO_APP' as tipo,
    e.id as event_id,
    e.title as event_title,
    e.date as event_date,
    e.entry_fee as event_price,
    COUNT(p.id) as total_participants,
    COUNT(CASE WHEN p.payment_status = 'CONFIRMED' THEN 1 END) as confirmed_participants,
    COUNT(ft.id) as total_transactions,
    SUM(CASE WHEN ft.type = 'INCOME' THEN ft.amount ELSE 0 END) as total_income
FROM events e
LEFT JOIN participants p ON p.event_id = e.id
LEFT JOIN financial_transactions ft ON ft.event_id = e.id
WHERE e.status IN ('PUBLISHED', 'OPEN', 'IN_PROGRESS', 'COMPLETED')
GROUP BY e.id, e.title, e.date, e.entry_fee
ORDER BY e.date DESC
LIMIT 5;

-- 6. Verificar tipos de enum para validação
SELECT 
    'ENUM_TYPES' as tipo,
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('payment_status', 'transaction_type', 'event_status', 'event_type')
GROUP BY t.typname;
