-- Script para inserir transações financeiras de teste compatíveis com o schema atual

-- Primeiro, vamos verificar se existem eventos para usar como referência
-- Inserir algumas transações de receita (inscrições)
INSERT INTO financial_transactions (
    event_id, 
    amount, 
    type, 
    description, 
    transaction_date
)
SELECT 
    e.id,
    e.price,
    'INCOME'::transaction_type,
    'Pagamento de inscrição - ' || e.title,
    e.created_at + interval '1 hour'
FROM events e
WHERE e.price > 0
LIMIT 10;

-- Inserir algumas transações de despesa
INSERT INTO financial_transactions (
    event_id, 
    amount, 
    type, 
    description, 
    transaction_date
)
SELECT 
    e.id,
    (random() * 200 + 50)::decimal(10,2),
    'EXPENSE'::transaction_type,
    CASE 
        WHEN random() < 0.3 THEN 'Pagamento de arbitragem'
        WHEN random() < 0.5 THEN 'Aluguel de quadras'
        WHEN random() < 0.7 THEN 'Material esportivo'
        ELSE 'Despesas administrativas'
    END,
    e.created_at + interval '2 hours'
FROM events e
LIMIT 15;

-- Inserir mais algumas transações de receita para variar
INSERT INTO financial_transactions (
    event_id, 
    amount, 
    type, 
    description, 
    transaction_date
)
SELECT 
    e.id,
    (random() * 100 + 50)::decimal(10,2),
    'INCOME'::transaction_type,
    'Taxa adicional - ' || e.title,
    e.created_at + interval '3 hours'
FROM events e
WHERE random() < 0.5
LIMIT 8;
