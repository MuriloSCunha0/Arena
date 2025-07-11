import { supabase } from '../../lib/supabase';
import { FinancialTransaction } from '../../types';

// Função para converter dados do Supabase para nosso tipo FinancialTransaction
const transformTransaction = (data: any): FinancialTransaction => ({
  id: data.id,
  eventId: data.event_id,
  eventName: data.events?.title || data.event_name, // Get from joined events table or direct field
  participantId: data.participant_id,
  amount: data.amount,
  type: data.type, // INCOME ou EXPENSE conforme o enum transaction_type
  description: data.description,
  paymentMethod: data.payment_method, // PIX, CARD, CASH, OTHER conforme o enum payment_method
  status: data.status, // PENDING, CONFIRMED, CANCELLED conforme o enum payment_status
  transactionDate: data.transaction_date,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

// Função para converter nosso tipo FinancialTransaction para o formato do Supabase
const toSupabaseTransaction = (transaction: Partial<FinancialTransaction>) => ({
  event_id: transaction.eventId,
  participant_id: transaction.participantId,
  amount: transaction.amount,
  type: transaction.type,
  description: transaction.description,
  payment_method: transaction.paymentMethod,
  status: transaction.status,
  transaction_date: transaction.transactionDate || new Date().toISOString(),
});

export const FinancialsService = {
  // Buscar todas as transações
  async getAll(): Promise<FinancialTransaction[]> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        events (
          title
        )
      `)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data ? data.map(transformTransaction) : [];
  },

  // Buscar transações por evento
  async getByEventId(eventId: string): Promise<FinancialTransaction[]> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        events (
          title
        )
      `)
      .eq('event_id', eventId)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data ? data.map(transformTransaction) : [];
  },

  // Buscar uma transação por ID
  async getById(id: string): Promise<FinancialTransaction | null> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        events (
          title
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No data found
      throw error;
    }
    
    return data ? transformTransaction(data) : null;
  },

  // Criar uma nova transação
  async create(transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    // Validar tipo e status conforme os enums do banco
    if (transaction.type && !['INCOME', 'EXPENSE'].includes(transaction.type)) {
      throw new Error('O tipo de transação precisa ser INCOME ou EXPENSE');
    }
    
    if (transaction.status && !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(transaction.status)) {
      throw new Error('O status de pagamento precisa ser PENDING, CONFIRMED ou CANCELLED');
    }
    
    if (transaction.paymentMethod && !['PIX', 'CARD', 'CASH', 'OTHER'].includes(transaction.paymentMethod)) {
      throw new Error('O método de pagamento precisa ser PIX, CARD, CASH ou OTHER');
    }
    
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        ...toSupabaseTransaction(transaction),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return transformTransaction(data);
  },

  // Atualizar uma transação existente
  async update(id: string, transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    // Validar tipo e status conforme os enums do banco
    if (transaction.type && !['INCOME', 'EXPENSE'].includes(transaction.type)) {
      throw new Error('O tipo de transação precisa ser INCOME ou EXPENSE');
    }
    
    if (transaction.status && !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(transaction.status)) {
      throw new Error('O status de pagamento precisa ser PENDING, CONFIRMED ou CANCELLED');
    }
    
    if (transaction.paymentMethod && !['PIX', 'CARD', 'CASH', 'OTHER'].includes(transaction.paymentMethod)) {
      throw new Error('O método de pagamento precisa ser PIX, CARD, CASH ou OTHER');
    }
    
    const { data, error } = await supabase
      .from('financial_transactions')
      .update({
        ...toSupabaseTransaction(transaction),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformTransaction(data);
  },

  // Excluir uma transação
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Obter resumo financeiro por evento
  async getEventSummary(eventId: string): Promise<{
    income: number;
    expenses: number;
    pendingIncome: number;
    profit: number; // Adicionado para calcular automaticamente o lucro
  }> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        events (
          title
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;

    const transactions = data ? data.map(transformTransaction) : [];
    const income = transactions
      .filter(t => t.type === 'INCOME' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const expenses = transactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const pendingIncome = transactions
      .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calcular o lucro (receitas - despesas)
    const profit = income - expenses;

    return { income, expenses, pendingIncome, profit };
  }
};
