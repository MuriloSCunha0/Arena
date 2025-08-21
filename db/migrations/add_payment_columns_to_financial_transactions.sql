-- Adicionar colunas de pagamento à tabela financial_transactions

-- Adicionar coluna payment_method
ALTER TABLE financial_transactions 
ADD COLUMN payment_method payment_method DEFAULT 'OTHER';

-- Adicionar coluna status (payment_status)
ALTER TABLE financial_transactions 
ADD COLUMN status payment_status DEFAULT 'PENDING';

-- Comentários para documentar as novas colunas
COMMENT ON COLUMN financial_transactions.payment_method IS 'Método de pagamento utilizado na transação';
COMMENT ON COLUMN financial_transactions.status IS 'Status atual da transação financeira';
