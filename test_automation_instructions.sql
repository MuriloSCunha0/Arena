-- Teste Completo da Automação Financeira
-- Este script demonstra o funcionamento da automação financeira implementada

-- 1. Criar evento de teste com preço específico
INSERT INTO events (
  id, title, description, event_date, max_participants, 
  registration_price, registration_deadline, status, created_at
) VALUES (
  'evt-automation-test-2024',
  'Torneio Teste - Automação V3',
  'Evento criado especificamente para testar automação financeira',
  '2024-12-28',
  16,
  89.50,
  '2024-12-26',
  'ACTIVE',
  NOW()
)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- 2. Criar participantes de teste
INSERT INTO participants (
  id, event_id, name, email, phone, payment_status, 
  registration_date, created_at
) VALUES 
(
  'prt-auto-test-001',
  'evt-automation-test-2024',
  'Pedro Automação',
  'pedro.auto@teste.com',
  '85987654321',
  'PENDING',
  NOW(),
  NOW()
),
(
  'prt-auto-test-002', 
  'evt-automation-test-2024',
  'Rita Pagamento',
  'rita.pag@teste.com',
  '85876543210',
  'PENDING',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. Verificar estado antes da confirmação
SELECT 
  'ANTES DA CONFIRMAÇÃO' as momento,
  p.name as participante,
  p.payment_status as status_pagamento,
  e.registration_price as preco_evento,
  COUNT(ft.id) as transacoes_existentes
FROM participants p
JOIN events e ON e.id = p.event_id
LEFT JOIN financial_transactions ft ON ft.participant_id = p.id
WHERE p.event_id = 'evt-automation-test-2024'
GROUP BY p.id, p.name, p.payment_status, e.registration_price
ORDER BY p.name;

-- INSTRUÇÕES PARA TESTE:
-- 
-- 1. Execute este script no seu banco de dados
-- 2. Vá para a aplicação Arena
-- 3. Navegue até o evento "Torneio Teste - Automação V3"
-- 4. Acesse a aba "Financeiro"
-- 5. Confirme o pagamento de um dos participantes pendentes
-- 6. Execute a query de verificação abaixo para ver a transação criada automaticamente

-- 4. Query para verificar APÓS confirmação na aplicação
/*
SELECT 
  'APÓS CONFIRMAÇÃO NA APLICAÇÃO' as momento,
  p.name as participante,
  p.payment_status as status_pagamento,
  ft.amount as valor_transacao,
  ft.type as tipo_transacao,
  ft.status as status_transacao,
  ft.payment_method as metodo_pagamento,
  ft.description as descricao,
  ft.created_at as data_criacao
FROM participants p
LEFT JOIN financial_transactions ft ON ft.participant_id = p.id
WHERE p.event_id = 'evt-automation-test-2024'
ORDER BY p.name, ft.created_at;
*/

-- 5. Resumo financeiro do evento de teste
/*
SELECT 
  'RESUMO FINANCEIRO' as tipo,
  e.title as evento,
  e.registration_price as preco_inscricao,
  COUNT(p.id) as total_participantes,
  SUM(CASE WHEN p.payment_status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmados,
  SUM(CASE WHEN p.payment_status = 'PENDING' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN ft.type = 'INCOME' AND ft.status = 'CONFIRMED' THEN ft.amount ELSE 0 END) as receita_total
FROM events e
LEFT JOIN participants p ON p.event_id = e.id
LEFT JOIN financial_transactions ft ON ft.participant_id = p.id
WHERE e.id = 'evt-automation-test-2024'
GROUP BY e.id, e.title, e.registration_price;
*/

-- 6. Limpeza após teste (descomente para executar)
/*
DELETE FROM financial_transactions WHERE event_id = 'evt-automation-test-2024';
DELETE FROM participants WHERE event_id = 'evt-automation-test-2024';
DELETE FROM events WHERE id = 'evt-automation-test-2024';
*/
