-- Inserir eventos de teste para a aplicação
INSERT INTO events (
  id,
  title,
  description,
  location,
  date,
  time,
  entry_fee,
  status,
  banner_image_url,
  standing_data,
  created_at
) VALUES 
(
  gen_random_uuid(),
  'Torneio de Beach Tennis Iniciante',
  'Torneio voltado para iniciantes no beach tennis. Venha participar e se divertir!',
  'Arena Beach Sports - Fortaleza/CE',
  '2025-08-25',
  '09:00:00',
  50.00,
  'OPEN',
  'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop',
  NULL,
  NOW()
),
(
  gen_random_uuid(),
  'Copa Beach Tennis Avançado',
  'Competição para jogadores avançados. Prêmios para os primeiros colocados!',
  'Centro Esportivo Aquiraz',
  '2025-09-01',
  '08:00:00',
  80.00,
  'OPEN',
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop',
  NULL,
  NOW()
),
(
  gen_random_uuid(),
  'Festival Beach Tennis Família',
  'Evento para toda família! Categorias para diferentes idades.',
  'Praia do Futuro - Fortaleza/CE',
  '2025-09-08',
  '10:00:00',
  30.00,
  'UPCOMING',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
  NULL,
  NOW()
),
(
  gen_random_uuid(),
  'Torneio Empresarial Beach Tennis',
  'Competição exclusiva para equipes de empresas. Networking e diversão!',
  'Clube Náutico Atlético Cearense',
  '2025-09-15',
  '14:00:00',
  100.00,
  'OPEN',
  'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop',
  NULL,
  NOW()
),
(
  gen_random_uuid(),
  'Beach Tennis Kids',
  'Torneio especial para crianças de 8 a 14 anos. Venha se divertir!',
  'Arena Beach Sports - Fortaleza/CE',
  '2025-09-22',
  '15:00:00',
  25.00,
  'OPEN',
  'https://images.unsplash.com/photo-1551727213-2b7d7da1e0de?w=800&h=600&fit=crop',
  NULL,
  NOW()
);
