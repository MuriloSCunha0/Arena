-- ========================================
-- SCRIPT PARA INSERIR DADOS DE QUADRAS
-- ========================================

-- Primeiro, vamos verificar se já existem quadras
SELECT COUNT(*) as total_quadras FROM courts;

-- Inserir quadras de exemplo se não existirem
INSERT INTO courts (
    id,
    name,
    location,
    type,
    status,
    surface,
    indoor,
    active,
    description,
    created_at,
    updated_at
) VALUES 
-- Quadras de Padel
(
    gen_random_uuid(),
    'Quadra 10',
    'Arena Nordeste',
    'PADEL',
    'AVAILABLE',
    'Sintético',
    true,
    true,
    'Quadra de Padel coberta com iluminação LED e ar condicionado. Ideal para jogos durante todo o dia.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 12',
    'Esporte Total',
    'BEACH_TENNIS',
    'AVAILABLE',
    'Areia',
    false,
    true,
    'Quadra oficial de Beach Tennis com areia importada e rede regulamentada.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 13',
    'Clube Centro',
    'PADEL',
    'AVAILABLE',
    'Cimento',
    true,
    true,
    'Quadra de Padel indoor com piso de alta qualidade e sistema de ventilação.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 14',
    'Arena Norte',
    'PADEL',
    'MAINTENANCE',
    'Sintético',
    true,
    true,
    'Quadra em manutenção preventiva. Retorna em breve com melhorias no piso.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 2',
    'Arena Sports Center - Lateral',
    'OTHER',
    'AVAILABLE',
    'Grama Sintética',
    false,
    true,
    'Quadra secundária para jogos simultâneos e treinos. Excelente para aquecimento.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 3',
    'Padel Pro',
    'PADEL',
    'AVAILABLE',
    'Sintético',
    false,
    true,
    'Quadra profissional ao ar livre com sistema de drenagem e iluminação noturna.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 5',
    'Tênis Elite',
    'OTHER',
    'AVAILABLE',
    'Cimento',
    true,
    true,
    'Quadra poliesportiva coberta, adequada para múltiplas modalidades.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 6',
    'Beach Sports',
    'BEACH_TENNIS',
    'AVAILABLE',
    'Areia',
    false,
    true,
    'Quadra oficial de Beach Tennis com vista para o mar. Ambiente único para competições.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra 8',
    'Clube do Sul',
    'PADEL',
    'BOOKED',
    'Saibro',
    true,
    true,
    'Quadra premium com piso de saibro importado. Reservada para eventos especiais.',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Quadra Central',
    'Arena Principal',
    'PADEL',
    'AVAILABLE',
    'Grama Sintética',
    false,
    true,
    'Quadra principal da arena com capacidade para espectadores e transmissões ao vivo.',
    NOW(),
    NOW()
)
ON CONFLICT (name, location) DO NOTHING;

-- Verificar os dados inseridos
SELECT 
    name,
    location,
    type,
    status,
    surface,
    indoor,
    active,
    description
FROM courts 
ORDER BY name;

-- Estatísticas das quadras
SELECT 
    type,
    COUNT(*) as quantidade,
    COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as disponiveis,
    COUNT(CASE WHEN indoor = true THEN 1 END) as cobertas
FROM courts 
WHERE active = true
GROUP BY type
ORDER BY type;

-- Quadras por status
SELECT 
    status,
    COUNT(*) as quantidade
FROM courts 
WHERE active = true
GROUP BY status
ORDER BY status;
