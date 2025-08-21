-- ========================================
-- VERIFICAÇÃO DA ESTRUTURA DA TABELA COURTS
-- ========================================

-- Verificar se a tabela courts existe
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'courts';

-- Verificar a estrutura da tabela courts
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'courts'
ORDER BY ordinal_position;

-- Verificar os tipos enums definidos
SELECT 
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('court_type', 'court_status')
GROUP BY t.typname;

-- Verificar índices na tabela
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'courts';

-- Verificar constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'courts'::regclass;

-- Se a tabela não existir, criar com a estrutura correta
CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    type court_type DEFAULT 'PADEL',
    status court_status DEFAULT 'AVAILABLE',
    surface VARCHAR(100),
    indoor BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT courts_name_location_unique UNIQUE (name, location),
    CONSTRAINT courts_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT courts_location_not_empty CHECK (LENGTH(TRIM(location)) > 0)
);

-- Criar os tipos enum se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'court_type') THEN
        CREATE TYPE court_type AS ENUM ('PADEL', 'BEACH_TENNIS', 'OTHER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'court_status') THEN
        CREATE TYPE court_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'BOOKED');
    END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_courts_type ON courts(type);
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);
CREATE INDEX IF NOT EXISTS idx_courts_active ON courts(active);
CREATE INDEX IF NOT EXISTS idx_courts_indoor ON courts(indoor);
CREATE INDEX IF NOT EXISTS idx_courts_location ON courts(location);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_courts_updated_at ON courts;
CREATE TRIGGER update_courts_updated_at
    BEFORE UPDATE ON courts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários na tabela para documentação
COMMENT ON TABLE courts IS 'Tabela para armazenar informações das quadras esportivas';
COMMENT ON COLUMN courts.id IS 'Identificador único da quadra';
COMMENT ON COLUMN courts.name IS 'Nome da quadra';
COMMENT ON COLUMN courts.location IS 'Localização/endereço da quadra';
COMMENT ON COLUMN courts.type IS 'Tipo de esporte da quadra (PADEL, BEACH_TENNIS, OTHER)';
COMMENT ON COLUMN courts.status IS 'Status atual da quadra (AVAILABLE, MAINTENANCE, BOOKED)';
COMMENT ON COLUMN courts.surface IS 'Tipo de superfície da quadra';
COMMENT ON COLUMN courts.indoor IS 'Se a quadra é coberta (indoor) ou não';
COMMENT ON COLUMN courts.active IS 'Se a quadra está ativa para uso';
COMMENT ON COLUMN courts.image_url IS 'URL da imagem da quadra';
COMMENT ON COLUMN courts.description IS 'Descrição adicional da quadra';
