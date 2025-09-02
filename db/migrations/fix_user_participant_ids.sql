-- ===================================================
-- MIGRAÇÃO PARA SINCRONIZAR IDs DE USERS E PARTICIPANTS
-- ===================================================

-- 1. Criar função para garantir que user_id seja sempre preenchido
CREATE OR REPLACE FUNCTION ensure_participant_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se user_id não estiver preenchido, tentar encontrar ou criar usuário
    IF NEW.user_id IS NULL THEN
        -- Tentar encontrar usuário existente pelo email
        SELECT id INTO NEW.user_id 
        FROM users 
        WHERE email = NEW.email 
        LIMIT 1;
        
        -- Se não encontrar, criar novo usuário
        IF NEW.user_id IS NULL THEN
            INSERT INTO users (
                email,
                full_name,
                phone,
                cpf,
                birth_date,
                app_metadata,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(NEW.email, 'participant_' || NEW.id || '@arena.com'),
                NEW.name,
                NEW.phone,
                NEW.cpf,
                NEW.birth_date,
                '{"role": "participant", "auto_created": true}',
                NOW(),
                NOW()
            ) RETURNING id INTO NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para garantir user_id em novos participants
DROP TRIGGER IF EXISTS ensure_user_id_trigger ON participants;
CREATE TRIGGER ensure_user_id_trigger
    BEFORE INSERT OR UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION ensure_participant_user_id();

-- 3. Migrar dados existentes - criar users para participants sem user_id
DO $$
DECLARE
    participant_record RECORD;
    new_user_id UUID;
BEGIN
    -- Para cada participante sem user_id
    FOR participant_record IN 
        SELECT * FROM participants WHERE user_id IS NULL
    LOOP
        -- Tentar encontrar usuário pelo email
        SELECT id INTO new_user_id 
        FROM users 
        WHERE email = participant_record.email 
        LIMIT 1;
        
        -- Se não encontrar, criar novo usuário
        IF new_user_id IS NULL THEN
            INSERT INTO users (
                email,
                full_name,
                phone,
                cpf,
                birth_date,
                app_metadata,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(participant_record.email, 'participant_' || participant_record.id || '@arena.com'),
                participant_record.name,
                participant_record.phone,
                participant_record.cpf,
                participant_record.birth_date,
                '{"role": "participant", "auto_created": true}',
                participant_record.registered_at,
                participant_record.updated_at
            ) RETURNING id INTO new_user_id;
        END IF;
        
        -- Atualizar participant com user_id
        UPDATE participants 
        SET user_id = new_user_id 
        WHERE id = participant_record.id;
        
        RAISE NOTICE 'Participante % agora tem user_id %', participant_record.id, new_user_id;
    END LOOP;
END $$;

-- 4. Tornar user_id obrigatório após migração
ALTER TABLE participants ALTER COLUMN user_id SET NOT NULL;

-- 5. Criar função para sincronizar dados entre users e participants
CREATE OR REPLACE FUNCTION sync_user_participant_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Se atualizar participant, sincronizar com user
    IF TG_TABLE_NAME = 'participants' THEN
        UPDATE users SET
            full_name = NEW.name,
            phone = NEW.phone,
            cpf = NEW.cpf,
            birth_date = NEW.birth_date,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    
    -- Se atualizar user, sincronizar com participants
    IF TG_TABLE_NAME = 'users' THEN
        UPDATE participants SET
            name = NEW.full_name,
            phone = NEW.phone,
            cpf = NEW.cpf,
            birth_date = NEW.birth_date,
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar triggers de sincronização
DROP TRIGGER IF EXISTS sync_participant_to_user ON participants;
CREATE TRIGGER sync_participant_to_user
    AFTER UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_participant_data();

DROP TRIGGER IF EXISTS sync_user_to_participant ON users;
CREATE TRIGGER sync_user_to_participant
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_participant_data();

-- 7. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);

-- 8. Criar view para facilitar consultas
CREATE OR REPLACE VIEW participant_users AS
SELECT 
    p.id as participant_id,
    p.event_id,
    p.name,
    p.email,
    p.phone,
    p.cpf,
    p.birth_date,
    p.partner_id,
    p.team_name,
    p.payment_status,
    p.registered_at,
    u.id as user_id,
    u.avatar_url,
    u.status as user_status,
    u.email_verified,
    u.app_metadata,
    u.preferences
FROM participants p
INNER JOIN users u ON p.user_id = u.id;

-- 9. Comentários de documentação
COMMENT ON TRIGGER ensure_user_id_trigger ON participants IS 
'Garante que todo participant tenha um user_id válido, criando usuário se necessário';

COMMENT ON TRIGGER sync_participant_to_user ON participants IS 
'Sincroniza dados alterados em participants para a tabela users';

COMMENT ON TRIGGER sync_user_to_participant ON users IS 
'Sincroniza dados alterados em users para a tabela participants';

COMMENT ON VIEW participant_users IS 
'View que combina dados de participants e users para facilitar consultas';
