-- Adicionar campo de data de nascimento na tabela participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Tabela para datas comemorativas
CREATE TABLE IF NOT EXISTS commemorative_dates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  month SMALLINT NOT NULL CHECK (month >= 1 AND month <= 12),
  day SMALLINT NOT NULL CHECK (day >= 1 AND day <= 31),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para registrar envios de notificações
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  event_id UUID REFERENCES events(id),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_participants_birthdate ON participants(EXTRACT(MONTH FROM birthdate), EXTRACT(DAY FROM birthdate));
CREATE INDEX IF NOT EXISTS idx_commemorative_dates_month_day ON commemorative_dates(month, day);
CREATE INDEX IF NOT EXISTS idx_notification_logs_participant_type ON notification_logs(participant_id, type);
