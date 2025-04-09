import { supabase } from '../../lib/supabase';
import { FinancialTransaction } from '../../types';

// Função para converter dados do Supabase para nosso tipo FinancialTransaction
const transformTransaction = (data: any): FinancialTransaction => ({
  id: data.id,
  eventId: data.event_id,
  participantId: data.participant_id,
  amount: data.amount,
  type: data.type,
  description: data.description,
  paymentMethod: data.payment_method,
  status: data.status,
  transactionDate: data.transaction_date,
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
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data.map(transformTransaction);
  },

  // Buscar transações por evento
  async getByEventId(eventId: string): Promise<FinancialTransaction[]> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('event_id', eventId)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data.map(transformTransaction);
  },

  // Buscar uma transação por ID
  async getById(id: string): Promise<FinancialTransaction | null> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;
    return transformTransaction(data);
  },

  // Criar uma nova transação
  async create(transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert(toSupabaseTransaction(transaction))
      .select()
      .single();

    if (error) throw error;
    return transformTransaction(data);
  },

  // Atualizar uma transação existente
  async update(id: string, transaction: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update(toSupabaseTransaction(transaction))
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
  }> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;

    const transactions = data.map(transformTransaction);
    const income = transactions
      .filter(t => t.type === 'INCOME' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingIncome = transactions
      .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, pendingIncome };
  }
};
