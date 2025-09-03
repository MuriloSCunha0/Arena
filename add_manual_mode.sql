-- Adicionar MANUAL ao enum team_formation_type
ALTER TYPE team_formation_type ADD VALUE 'MANUAL';

-- Verificar se o valor foi adicionado
SELECT enumlabel FROM pg_enum WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'team_formation_type'
);
