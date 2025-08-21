-- ===============================================
-- VALIDAÇÃO DE INTEGRIDADE: FORMULÁRIO vs BANCO
-- ===============================================

-- 1. Verificar estrutura da tabela courts
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courts'
ORDER BY ordinal_position;

-- 2. Verificar tipos ENUM para court_type
SELECT enumlabel 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'court_type';

-- 3. Verificar tipos ENUM para court_status  
SELECT enumlabel 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'court_status';

-- 4. Verificar se existem quadras no banco
SELECT 
    COUNT(*) as total_quadras,
    COUNT(CASE WHEN type = 'BEACH_TENNIS' THEN 1 END) as beach_tennis_quadras,
    COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as disponiveis,
    COUNT(CASE WHEN active = true THEN 1 END) as ativas
FROM courts;

-- 5. Verificar campos obrigatórios vs opcionais
SELECT 
    id,
    name,
    location,
    type,
    status,
    surface,
    indoor,
    active,
    length_meters,
    width_meters,
    hourly_rate,
    lighting,
    description,
    created_at
FROM courts 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Verificar se há campos NULL onde não deveria
SELECT 
    'Campos obrigatórios com NULL' as problema,
    COUNT(*) as ocorrencias
FROM courts 
WHERE name IS NULL 
   OR location IS NULL 
   OR type IS NULL 
   OR status IS NULL;

-- 7. Verificar campos de dimensões (importante para Beach Tennis)
SELECT 
    COUNT(*) as total,
    COUNT(length_meters) as com_comprimento,
    COUNT(width_meters) as com_largura,
    AVG(length_meters) as comprimento_medio,
    AVG(width_meters) as largura_media
FROM courts 
WHERE type = 'BEACH_TENNIS';

-- 8. Verificar campos de preço
SELECT 
    COUNT(*) as total,
    COUNT(hourly_rate) as com_preco,
    AVG(hourly_rate) as preco_medio,
    MIN(hourly_rate) as preco_minimo,
    MAX(hourly_rate) as preco_maximo
FROM courts;
