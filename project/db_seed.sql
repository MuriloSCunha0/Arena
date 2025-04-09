-- Sample data for testing

-- Insert sample events
INSERT INTO events (
  type, 
  title, 
  description, 
  location, 
  date, 
  time, 
  price, 
  max_participants,
  prize, 
  rules, 
  team_formation, 
  categories
) VALUES
(
  'TOURNAMENT',
  'Torneio de Padel - Outubro 2023',
  'Venha participar do nosso torneio mensal de padel. Competição em duplas com premiação para os três primeiros lugares.',
  'Arena Conexão',
  '2023-10-15',
  '09:00',
  150.00,
  32,
  'R$ 3000 em premiação (divididos entre os 3 primeiros)',
  'Regras oficiais de padel. Cada partida será melhor de 3 sets.',
  'FORMED',
  ARRAY['Masculino', 'Iniciante']
),
(
  'POOL',
  'Bolão Copa do Brasil 2023',
  'Participe do bolão oficial da Arena Conexão para a Copa do Brasil 2023.',
  'Online',
  '2023-09-01',
  '18:00',
  50.00,
  100,
  'R$ 3000 para o primeiro lugar',
  'Cada participante deve enviar seus palpites até 30 minutos antes do início dos jogos.',
  'RANDOM',
  ARRAY['Futebol', 'Copa do Brasil']
),
(
  'TOURNAMENT',
  'Torneio de Padel - Novembro 2023',
  'Edição especial do nosso torneio mensal de padel. Competição em duplas.',
  'Arena Conexão',
  '2023-11-20',
  '10:00',
  180.00,
  48,
  'R$ 4500 em premiação (divididos entre os 3 primeiros)',
  'Regras oficiais de padel. Cada partida será melhor de 3 sets.',
  'FORMED',
  ARRAY['Misto', 'Avançado']
);

-- Insert sample participants
INSERT INTO participants (
  event_id,
  name,
  email,
  phone,
  payment_status,
  registered_at
) 
SELECT 
  e.id,
  'Participante ' || i,
  'participante' || i || '@example.com',
  '11 9' || LPAD(FLOOR(random() * 100000000)::TEXT, 8, '0'),
  CASE WHEN random() < 0.7 THEN 'CONFIRMED' ELSE 'PENDING' END,
  NOW() - (random() * interval '14 days')
FROM 
  events e,
  generate_series(1, 10) i
WHERE 
  e.title = 'Torneio de Padel - Outubro 2023';

-- Insert financial transactions
INSERT INTO financial_transactions (
  event_id,
  participant_id,
  amount,
  type,
  description,
  payment_method,
  status,
  transaction_date
)
SELECT
  p.event_id,
  p.id,
  (SELECT price FROM events WHERE id = p.event_id),
  'INCOME',
  'Inscrição - ' || p.name,
  'PIX',
  p.payment_status,
  p.registered_at + interval '1 hour'
FROM
  participants p
WHERE
  p.payment_status = 'CONFIRMED';

-- Add some expense transactions
INSERT INTO financial_transactions (
  event_id,
  amount,
  type,
  description,
  payment_method,
  status,
  transaction_date
)
SELECT
  id as event_id,
  CASE 
    WHEN title LIKE '%Outubro%' THEN 1200.00
    WHEN title LIKE '%Novembro%' THEN 1500.00
    ELSE 800.00
  END as amount,
  'EXPENSE',
  'Aluguel de quadras',
  'PIX',
  'CONFIRMED',
  date::timestamp - interval '3 days'
FROM
  events;
