-- Inserir eventos de teste para o sistema
-- Data de hoje: 2025-08-18

-- Limpar eventos existentes (opcional)
-- DELETE FROM events;

-- Inserir eventos futuros para teste
INSERT INTO events (
    title, 
    description, 
    type, 
    team_formation, 
    max_participants, 
    min_participants,
    location, 
    date, 
    time, 
    entry_fee, 
    status,
    categories,
    skill_level
) VALUES 
(
    'Torneio de Beach Tennis - Iniciantes',
    'Torneio voltado para iniciantes no beach tennis. Venha se divertir e conhecer novos amigos!',
    'TOURNAMENT',
    'FORMED',
    32,
    8,
    'Arena Beach Club - Fortaleza',
    '2025-08-25',
    '09:00:00',
    75.00,
    'OPEN',
    ARRAY['Iniciante'],
    'BEGINNER'
),
(
    'Copa Arena - Duplas Mistas',
    'Competição em duplas mistas. Uma oportunidade única para casais e amigos competirem juntos.',
    'TOURNAMENT',
    'FORMED',
    64,
    16,
    'Complexo Esportivo Arena',
    '2025-09-01',
    '08:00:00',
    120.00,
    'OPEN',
    ARRAY['Mista'],
    'INTERMEDIATE'
),
(
    'Circuito Beach Tennis CE - Etapa 1',
    'Primeira etapa do circuito cearense de beach tennis. Evento oficial com ranking.',
    'TOURNAMENT',
    'FORMED',
    128,
    32,
    'Praia do Futuro - Fortaleza',
    '2025-09-15',
    '07:00:00',
    200.00,
    'OPEN',
    ARRAY['Masculino A', 'Feminino A', 'Mista A'],
    'ADVANCED'
),
(
    'Pool Play - Quinta Diversão',
    'Evento descontraído de pool play. Ideal para quem quer jogar sem pressão da competição.',
    'POOL',
    'RANDOM',
    16,
    8,
    'Arena Indoor - Aldeota',
    '2025-08-22',
    '19:00:00',
    50.00,
    'OPEN',
    ARRAY['Livre'],
    'RECREATIONAL'
),
(
    'Torneio Corporativo Arena',
    'Torneio exclusivo para funcionários de empresas parceiras. Networking e esporte.',
    'TOURNAMENT',
    'FORMED',
    48,
    12,
    'Centro de Convenções Arena',
    '2025-09-08',
    '14:00:00',
    100.00,
    'OPEN',
    ARRAY['Corporativo'],
    'INTERMEDIATE'
),
(
    'Festival Beach Tennis Kids',
    'Evento especial para crianças e adolescentes. Categoria infantil e juvenil.',
    'TOURNAMENT',
    'FORMED',
    24,
    8,
    'Escola de Esportes Arena',
    '2025-08-31',
    '15:00:00',
    40.00,
    'OPEN',
    ARRAY['Infantil', 'Juvenil'],
    'BEGINNER'
);

-- Verificar se os eventos foram inseridos
SELECT id, title, date, location, entry_fee, status 
FROM events 
WHERE date > CURRENT_DATE 
ORDER BY date;
