-- Script para testar a funcionalidade de criação automática de transações financeiras
-- Este script cria dados de teste para verificar se a funcionalidade está funcionando

-- Primeiro, vamos garantir que existe um evento de teste
INSERT INTO events (
    id,
    type,
    title,
    description,
    location,
    date,
    time,
    price,
    max_participants,
    team_formation,
    status,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'TOURNAMENT',
    'Torneio Teste - Transações Automáticas',
    'Evento para testar a criação automática de transações financeiras',
    'Quadra Central',
    '2025-09-15',
    '14:00',
    150.00,
    32,
    'FORMED',
    'PUBLISHED',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    updated_at = NOW();

-- Agora vamos criar alguns participantes de teste com status PENDING
INSERT INTO participants (
    id,
    event_id,
    user_id,
    name,
    email,
    phone,
    cpf,
    payment_status,
    registered_at,
    created_at,
    updated_at
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440099', -- User ID fictício
    'João Silva - Teste',
    'joao.teste@email.com',
    '11999887766',
    '12345678901',
    'PENDING',
    NOW(),
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440098', -- User ID fictício
    'Maria Santos - Teste',
    'maria.teste@email.com',
    '11999887767',
    '12345678902',
    'PENDING',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    payment_status = 'PENDING',
    updated_at = NOW();

-- Verificar se as transações financeiras existem para esses participantes
SELECT 
    p.name as participante,
    p.payment_status,
    ft.amount,
    ft.description,
    ft.status as transaction_status,
    ft.created_at as transaction_created
FROM participants p
LEFT JOIN financial_transactions ft ON ft.participant_id = p.id
WHERE p.event_id = '550e8400-e29b-41d4-a716-446655440001'
ORDER BY p.name;
