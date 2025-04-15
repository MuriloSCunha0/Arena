-- Tabela para transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_id VARCHAR(255) NOT NULL UNIQUE,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  participant_id UUID REFERENCES participants(id),
  event_id UUID REFERENCES events(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  qr_code TEXT,
  qr_code_text TEXT,
  payment_link TEXT,
  invoice_id VARCHAR(255),
  invoice_url TEXT,
  fiscal_data JSONB,
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_participant_id ON payment_transactions(participant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_event_id ON payment_transactions(event_id);
