-- =====================================================
-- SCRIPT DE DIAGNÓSTICO RÁPIDO DO SISTEMA DE TORNEIOS
-- =====================================================
-- Este script SQL executa verificações diretas no banco de dados
-- para identificar problemas comuns no sistema de torneios

-- 1. ESTATÍSTICAS GERAIS
-- =====================================================
SELECT 'ESTATÍSTICAS GERAIS' as secao;

SELECT 
    'Eventos' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as rascunhos,
    COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END) as publicados,
    COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as abertos,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as em_andamento,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completados,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelados
FROM events;

SELECT 
    'Torneios' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'CREATED' THEN 1 END) as criados,
    COUNT(CASE WHEN status = 'STARTED' THEN 1 END) as iniciados,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as em_andamento,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completados
FROM tournaments;

SELECT 
    'Participantes' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN payment_status = 'PENDING' THEN 1 END) as pagamento_pendente,
    COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as pagamento_confirmado,
    COUNT(CASE WHEN payment_status = 'CANCELLED' THEN 1 END) as pagamento_cancelado
FROM participants;

SELECT 
    'Partidas' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as agendadas,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as em_andamento,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completadas,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as canceladas
FROM matches;

-- 2. PROBLEMAS CRÍTICOS
-- =====================================================
SELECT 'PROBLEMAS CRÍTICOS' as secao;

-- Eventos com participantes além do limite
SELECT 
    'Eventos com participantes excedendo limite' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as event_ids
FROM events 
WHERE current_participants > max_participants;

-- Torneios órfãos (sem evento)
SELECT 
    'Torneios órfãos (sem evento)' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(t.id) as tournament_ids
FROM tournaments t
LEFT JOIN events e ON t.event_id = e.id
WHERE e.id IS NULL;

-- Participantes órfãos (sem evento)
SELECT 
    'Participantes órfãos (sem evento)' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(p.id) as participant_ids
FROM participants p
LEFT JOIN events e ON p.event_id = e.id
WHERE e.id IS NULL;

-- Partidas órfãs (sem evento ou torneio)
SELECT 
    'Partidas órfãs (sem evento ou torneio)' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(m.id) as match_ids
FROM matches m
LEFT JOIN events e ON m.event_id = e.id
LEFT JOIN tournaments t ON m.tournament_id = t.id
WHERE e.id IS NULL OR t.id IS NULL;

-- 3. PROBLEMAS DE INTEGRIDADE DE DADOS
-- =====================================================
SELECT 'PROBLEMAS DE INTEGRIDADE' as secao;

-- Partidas com teams iguais
SELECT 
    'Partidas com mesmo time nos dois lados' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as match_ids
FROM matches 
WHERE team1_ids = team2_ids;

-- Partidas completadas sem vencedor
SELECT 
    'Partidas completadas sem vencedor' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as match_ids
FROM matches 
WHERE status = 'COMPLETED' AND winner_team IS NULL;

-- Partidas com vencedor mas não completadas
SELECT 
    'Partidas com vencedor mas não completadas' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as match_ids
FROM matches 
WHERE status != 'COMPLETED' AND winner_team IS NOT NULL;

-- Participantes com parceiro inválido
SELECT 
    'Participantes com partner_id inválido' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(p1.id) as participant_ids
FROM participants p1
LEFT JOIN participants p2 ON p1.partner_id = p2.id
WHERE p1.partner_id IS NOT NULL AND p2.id IS NULL;

-- 4. PROBLEMAS DE UUID E REFERÊNCIAS
-- =====================================================
SELECT 'PROBLEMAS DE UUID' as secao;

-- Verificar se algum ID não é um UUID válido (formato básico)
SELECT 
    'Events com UUID inválido' as problema,
    COUNT(*) as quantidade
FROM events 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

SELECT 
    'Tournaments com UUID inválido' as problema,
    COUNT(*) as quantidade
FROM tournaments 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

SELECT 
    'Participants com UUID inválido' as problema,
    COUNT(*) as quantidade
FROM participants 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

SELECT 
    'Matches com UUID inválido' as problema,
    COUNT(*) as quantidade
FROM matches 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 5. ANÁLISE DE TORNEIOS ESPECÍFICA
-- =====================================================
SELECT 'ANÁLISE DE TORNEIOS' as secao;

-- Torneios com dados JSONB problemáticos
SELECT 
    'Torneios com matches_data inválido' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as tournament_ids
FROM tournaments 
WHERE matches_data IS NULL 
   OR jsonb_typeof(matches_data) != 'array';

SELECT 
    'Torneios com teams_data inválido' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as tournament_ids
FROM tournaments 
WHERE teams_data IS NULL 
   OR jsonb_typeof(teams_data) != 'array';

SELECT 
    'Torneios com elimination_bracket inválido' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as tournament_ids
FROM tournaments 
WHERE elimination_bracket IS NULL 
   OR jsonb_typeof(elimination_bracket) != 'object';

-- 6. ANÁLISE DE BRACKETS DE ELIMINAÇÃO
-- =====================================================
SELECT 'ANÁLISE DE BRACKETS' as secao;

-- Verificar se existem torneios de eliminação
WITH elimination_tournaments AS (
    SELECT id, event_id, format, elimination_bracket, matches_data
    FROM tournaments 
    WHERE format IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'GROUP_STAGE_ELIMINATION')
)
SELECT 
    'Torneios de eliminação sem bracket' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as tournament_ids
FROM elimination_tournaments
WHERE elimination_bracket IS NULL 
   OR jsonb_typeof(elimination_bracket) != 'object'
   OR elimination_bracket = '{}'::jsonb;

-- 7. PROBLEMAS DE PAGAMENTO
-- =====================================================
SELECT 'PROBLEMAS DE PAGAMENTO' as secao;

-- Participantes pagos sem dados de pagamento
SELECT 
    'Participantes pagos sem data de pagamento' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as participant_ids
FROM participants 
WHERE payment_status = 'PAID' AND payment_date IS NULL;

SELECT 
    'Participantes pagos sem valor de pagamento' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as participant_ids
FROM participants 
WHERE payment_status = 'PAID' AND payment_amount IS NULL;

SELECT 
    'Participantes pagos sem método de pagamento' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as participant_ids
FROM participants 
WHERE payment_status = 'PAID' AND payment_method IS NULL;

-- 8. TIMESTAMPS INCONSISTENTES
-- =====================================================
SELECT 'TIMESTAMPS INCONSISTENTES' as secao;

-- Partidas com timestamps inválidos
SELECT 
    'Partidas com started_at anterior a scheduled_at' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as match_ids
FROM matches 
WHERE started_at IS NOT NULL 
  AND scheduled_at IS NOT NULL 
  AND started_at < scheduled_at;

SELECT 
    'Partidas com completed_at anterior a started_at' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as match_ids
FROM matches 
WHERE completed_at IS NOT NULL 
  AND started_at IS NOT NULL 
  AND completed_at < started_at;

-- Eventos com datas inválidas
SELECT 
    'Eventos com end_date anterior a date' as problema,
    COUNT(*) as quantidade,
    ARRAY_AGG(id) as event_ids
FROM events 
WHERE end_date IS NOT NULL 
  AND end_date < date;

-- 9. VALIDAÇÃO INTEGRADA DO SISTEMA
-- =====================================================
SELECT 'VALIDAÇÃO INTEGRADA' as secao;

-- Executar função de validação integrada se existir
SELECT * FROM validate_tournament_data_integrity();

-- 10. RESUMO FINAL
-- =====================================================
SELECT 'RESUMO' as secao;

SELECT 
    'Total de registros no sistema' as metrica,
    (SELECT COUNT(*) FROM events) as events,
    (SELECT COUNT(*) FROM tournaments) as tournaments,
    (SELECT COUNT(*) FROM participants) as participants,
    (SELECT COUNT(*) FROM matches) as matches;

-- Nota: Este script deve ser executado no console SQL do Supabase
-- ou através de um cliente PostgreSQL conectado ao banco de dados.
