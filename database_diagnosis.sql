-- Script de Diagnóstico dos Dados do Banco
-- Para identificar por que os gráficos estão vazios

-- 1. Verificar eventos existentes
SELECT 
    'EVENTOS' as tabela,
    COUNT(*) as total_registros,
    MIN(date) as data_mais_antiga,
    MAX(date) as data_mais_recente
FROM events;

-- 2. Verificar estrutura dos eventos
SELECT 
    'ESTRUTURA_EVENTOS' as info,
    id,
    title,
    type,
    date,
    entry_fee,
    max_participants,
    current_participants,
    status,
    created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Verificar participantes
SELECT 
    'PARTICIPANTES' as tabela,
    COUNT(*) as total_registros,
    payment_status,
    COUNT(*) as count_por_status
FROM participants 
GROUP BY payment_status;

-- 4. Verificar transações financeiras  
SELECT 
    'TRANSACOES_FINANCEIRAS' as tabela,
    COUNT(*) as total_registros,
    type,
    status,
    COUNT(*) as count_por_tipo_status
FROM financial_transactions 
GROUP BY type, status;

-- 5. Verificar relacionamento eventos-participantes
SELECT 
    'EVENTOS_COM_PARTICIPANTES' as info,
    e.title,
    e.date,
    e.entry_fee,
    COUNT(p.id) as total_participantes,
    COUNT(CASE WHEN p.payment_status = 'CONFIRMED' THEN 1 END) as confirmados,
    COUNT(CASE WHEN p.payment_status = 'PENDING' THEN 1 END) as pendentes
FROM events e
LEFT JOIN participants p ON p.event_id = e.id
GROUP BY e.id, e.title, e.date, e.entry_fee
ORDER BY e.date DESC;

-- 6. Verificar relacionamento eventos-transações
SELECT 
    'EVENTOS_COM_TRANSACOES' as info,
    e.title,
    e.date,
    COUNT(ft.id) as total_transacoes,
    SUM(CASE WHEN ft.type = 'INCOME' THEN ft.amount ELSE 0 END) as receita_total,
    SUM(CASE WHEN ft.type = 'EXPENSE' THEN ft.amount ELSE 0 END) as despesa_total
FROM events e
LEFT JOIN financial_transactions ft ON ft.event_id = e.id
GROUP BY e.id, e.title, e.date
ORDER BY e.date DESC;

-- 7. Verificar dados de participantes com problemas de mapeamento
SELECT 
    'VERIFICACAO_CAMPOS_PARTICIPANTES' as info,
    COUNT(*) as total,
    COUNT(event_id) as com_event_id,
    COUNT(payment_status) as com_payment_status,
    COUNT(name) as com_name
FROM participants;

-- 8. Verificar se há problemas de encoding ou caracteres especiais
SELECT 
    'SAMPLE_DATA' as info,
    e.title,
    p.name,
    p.payment_status,
    ft.description
FROM events e
LEFT JOIN participants p ON p.event_id = e.id
LEFT JOIN financial_transactions ft ON ft.event_id = e.id
LIMIT 3;
