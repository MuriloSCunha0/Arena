import { create } from 'zustand';
import { FinancialTransaction } from '../types';
import { FinancialsService, EventsService } from '../services';

interface FinancialsState {
  transactions: FinancialTransaction[];
  eventTransactions: FinancialTransaction[];
  financialSummary: {
    income: number;
    expenses: number;
    pendingIncome: number;
  };
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAllTransactions: () => Promise<void>;
  fetchTransactionsByEvent: (eventId: string) => Promise<void>;
  fetchEventSummary: (eventId: string) => Promise<void>;
  addTransaction: (transaction: Partial<FinancialTransaction>) => Promise<FinancialTransaction>;
  updateTransaction: (id: string, transaction: Partial<FinancialTransaction>) => Promise<FinancialTransaction>;
  deleteTransaction: (id: string) => Promise<void>;
  clearEventTransactions: () => void;
  clearError: () => void;
}

export const useFinancialsStore = create<FinancialsState>((set) => ({
  transactions: [],
  eventTransactions: [],
  financialSummary: {
    income: 0,
    expenses: 0,
    pendingIncome: 0
  },
  loading: false,
  error: null,

  fetchAllTransactions: async () => {
    set({ loading: true, error: null });
    try {
      console.log('🔍 [FinancialsStore] Iniciando busca de transações...');
      
      // Fetch transactions
      const transactions = await FinancialsService.getAll();
      console.log(`✅ [FinancialsStore] Transações recebidas do serviço:`, {
        total: transactions.length,
        primeiras3: transactions.slice(0, 3).map(t => ({
          id: t.id,
          eventId: t.eventId,
          type: t.type,
          amount: t.amount
        }))
      });
      
      // Get unique event IDs
      const eventIds = Array.from(new Set(transactions.map(t => t.eventId)));
      console.log(`🔍 [FinancialsStore] Event IDs únicos encontrados:`, eventIds);
      
      // Create a map of event IDs to event titles
      const eventMap: Record<string, string> = {};
      
      // Fetch event details for each unique event ID
      for (const id of eventIds) {
        try {
          const event = await EventsService.getById(id);
          if (event) {
            eventMap[id] = event.title;
          }
        } catch (error) {
          console.error(`Error fetching event ${id}:`, error);
        }
      }
      
      // Add event names to transactions
      const enrichedTransactions = transactions.map(transaction => ({
        ...transaction,
        eventName: eventMap[transaction.eventId] || 'Evento desconhecido'
      }));
      
      console.log(`🔄 [FinancialsStore] Transações enriquecidas:`, {
        total: enrichedTransactions.length,
        eventosMapeados: Object.keys(eventMap).length
      });
      
      set({ transactions: enrichedTransactions, loading: false });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ error: error instanceof Error ? error.message : 'Falha ao buscar transações', loading: false });
    }
  },

  fetchTransactionsByEvent: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const eventTransactions = await FinancialsService.getByEventId(eventId);
      
      // Fetch event details to get the event name
      let eventName = 'Evento desconhecido';
      try {
        const event = await EventsService.getById(eventId);
        if (event) {
          eventName = event.title;
        }
      } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);
      }
      
      // Add event name to transactions
      const enrichedTransactions = eventTransactions.map(transaction => ({
        ...transaction,
        eventName
      }));
      
      set({ eventTransactions: enrichedTransactions, loading: false });
    } catch (error) {
      console.error(`Error fetching transactions for event ${eventId}:`, error);
      set({ error: error instanceof Error ? error.message : 'Falha ao buscar transações do evento', loading: false });
    }
  },

  fetchEventSummary: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const summary = await FinancialsService.getEventSummary(eventId);
      set({ financialSummary: summary, loading: false });
    } catch (error) {
      console.error(`Error fetching financial summary for event ${eventId}:`, error);
      set({ error: error instanceof Error ? error.message : 'Falha ao buscar resumo financeiro do evento', loading: false });
    }
  },

  addTransaction: async (transaction: Partial<FinancialTransaction>) => {
    set({ loading: true, error: null });
    try {
      const newTransaction = await FinancialsService.create(transaction);
      
      // Fetch event name if not provided
      let eventName = transaction.eventName;
      if (!eventName && transaction.eventId) {
        try {
          const event = await EventsService.getById(transaction.eventId);
          if (event) {
            eventName = event.title;
          }
        } catch (error) {
          console.error(`Error fetching event ${transaction.eventId}:`, error);
        }
      }
      
      // Add event name to the new transaction
      const enrichedTransaction = {
        ...newTransaction,
        eventName: eventName || 'Evento desconhecido'
      };
      
      set(state => ({
        transactions: [...state.transactions, enrichedTransaction],
        eventTransactions: transaction.eventId === state.eventTransactions[0]?.eventId
          ? [...state.eventTransactions, enrichedTransaction]
          : state.eventTransactions,
        loading: false
      }));
      
      return enrichedTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      set({ error: error instanceof Error ? error.message : 'Falha ao adicionar transação', loading: false });
      throw error;
    }
  },

  updateTransaction: async (id: string, transaction: Partial<FinancialTransaction>) => {
    set({ loading: true, error: null });
    try {
      const updatedTransaction = await FinancialsService.update(id, transaction);
      
      set(state => ({
        transactions: state.transactions.map(t => t.id === id ? updatedTransaction : t),
        eventTransactions: state.eventTransactions.map(t => t.id === id ? updatedTransaction : t),
        loading: false
      }));
      
      return updatedTransaction;
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      set({ error: error instanceof Error ? error.message : 'Falha ao atualizar transação', loading: false });
      throw error;
    }
  },

  deleteTransaction: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await FinancialsService.delete(id);
      
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id),
        eventTransactions: state.eventTransactions.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      set({ error: error instanceof Error ? error.message : 'Falha ao excluir transação', loading: false });
      throw error;
    }
  },

  clearEventTransactions: () => set({ eventTransactions: [] }),
  clearError: () => set({ error: null })
}));
