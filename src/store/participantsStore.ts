import { create } from 'zustand';
// Import the shared CreateParticipantDTO
import { Participant, CreateParticipantDTO, TransactionType, PaymentStatus, PaymentMethod } from '../types';
import { ParticipantsService, FinancialsService, EventsService } from '../services';
import { traduzirErroSupabase } from '../lib/supabase';
import { isCacheError } from '../utils/cacheUtils';

interface ParticipantsState {
  eventParticipants: Participant[];
  allParticipants: Participant[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchParticipantsByEvent: (eventId: string) => Promise<void>;
  fetchAllParticipants: () => Promise<void>;
  // Use the imported CreateParticipantDTO
  createParticipant: (data: CreateParticipantDTO) => Promise<Participant>;
  updateParticipantPayment: (id: string, status: 'PENDING' | 'CONFIRMED') => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useParticipantsStore = create<ParticipantsState>((set, get) => ({
  eventParticipants: [],
  allParticipants: [],
  loading: false,
  error: null,

  fetchParticipantsByEvent: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      const participants = await ParticipantsService.getByEventId(eventId);
      set({ eventParticipants: participants, loading: false });    } catch (error) {      
      console.error(`Erro ao buscar participantes para o evento ${eventId}:`, error);
      set({
        error: traduzirErroSupabase(error) || 'Falha ao buscar participantes',
        loading: false
      });
    }
  },

  fetchAllParticipants: async () => {
    set({ loading: true, error: null });
    try {
      console.log('🔍 [ParticipantsStore] Buscando todos os participantes...');
      
      const participants = await ParticipantsService.getAll();
      
      console.log(`✅ [ParticipantsStore] Participantes carregados:`, {
        total: participants.length,
        primeiros3: participants.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          eventId: p.eventId,
          paymentStatus: p.paymentStatus
        }))
      });
      
      set({ allParticipants: participants, loading: false });
    } catch (error) {      
      console.error('❌ [ParticipantsStore] Erro ao buscar todos os participantes:', error);
      set({
        error: traduzirErroSupabase(error) || 'Falha ao buscar todos os participantes',
        loading: false
      });
    }
  },

  // Update createParticipant to use the imported DTO
  createParticipant: async (data: CreateParticipantDTO) => {
    set({ loading: true, error: null });
    try {
      const newParticipant = await ParticipantsService.create(data);
      
      // Aqui podemos atualizar a lista completa para garantir que estamos vendo todos os participantes,
      // incluindo os que foram criados em outra parte do sistema
      if (data.eventId) {
        // Recarregar todos os participantes do evento para garantir consistência
        await ParticipantsService.getByEventId(data.eventId)
          .then(participants => {
            set({ eventParticipants: participants, loading: false });
          })
          .catch(error => {
            console.error('Erro ao recarregar participantes após criação:', error);
            // Em caso de falha ao recarregar, adicionar apenas o novo participante
            const currentEventParticipants = get().eventParticipants;
            if (currentEventParticipants.length > 0 && currentEventParticipants[0].eventId === data.eventId) {
              set(state => ({ eventParticipants: [...state.eventParticipants, newParticipant], loading: false }));
            } else {
              set({ loading: false });
            }
          });
      } else {
        set({ loading: false });
      }

      // Optionally update allParticipants list if it's already populated
      if (get().allParticipants.length > 0) {
        set(state => ({ allParticipants: [...state.allParticipants, newParticipant] }));
      }

      return newParticipant;
    } catch (error) {      
      console.error('Erro ao criar participante:', error);
      let mensagemErro = 'Falha ao criar participante';
      
      // Verificar se é erro 406 especificamente
      if (error instanceof Error && error.message.includes('406')) {
        mensagemErro = 'Erro de permissão. Verifique se você tem acesso para criar participantes.';
      } else {
        mensagemErro = traduzirErroSupabase(error) || mensagemErro;
      }
      
      set({
        error: mensagemErro,
        loading: false
      });
      
      // Lançar um erro com a mensagem traduzida
      const erroTraduzido = new Error(mensagemErro);
      throw erroTraduzido; // Re-throw error to be caught by the form
    }
  },

  updateParticipantPayment: async (id: string, status: 'PENDING' | 'CONFIRMED') => {
    set({ loading: true, error: null });
    try {
      // Primeiro, buscar os dados do participante para ter as informações necessárias
      const currentParticipant = get().eventParticipants.find(p => p.id === id);
      if (!currentParticipant) {
        throw new Error('Participante não encontrado');
      }

      // Atualizar status de pagamento diretamente (sem cache retry para evitar recursão)
      const updatedParticipant = await ParticipantsService.updatePaymentStatus(id, status);

      // Se o status foi alterado para CONFIRMED, criar transação financeira automaticamente
      if (status === 'CONFIRMED' && currentParticipant.paymentStatus !== 'CONFIRMED') {
        try {
          // Buscar informações do evento para obter o preço
          const event = await EventsService.getById(currentParticipant.eventId);
          if (event) {
            // Criar transação financeira de receita (sem campo status pois não existe na tabela)
            await FinancialsService.create({
              eventId: currentParticipant.eventId,
              participantId: id,
              amount: event.price,
              type: TransactionType.INCOME,
              description: `Pagamento de inscrição - ${currentParticipant.name}`,
              paymentMethod: PaymentMethod.OTHER, // Default method since participant doesn't have this field
              status: PaymentStatus.CONFIRMED, // Mantido para compatibilidade com interface
              transactionDate: new Date().toISOString()
            });
          }
        } catch (financeError) {
          console.error('Erro ao criar transação financeira:', financeError);
          // Não falha a operação principal, apenas logga o erro
          // A transação pode ser criada manualmente se necessário
        }
      }

      // Atualiza o participante na lista
      const eventParticipants = get().eventParticipants.map(participant =>
        participant.id === id ? updatedParticipant : participant
      );

      set({ eventParticipants, loading: false });
    } catch (error) {      
      console.error(`Erro ao atualizar pagamento do participante ${id}:`, error);
      
      // Usar detecção inteligente de erro de cache
      const cacheInfo = isCacheError(error);
      let mensagemErro = 'Falha ao atualizar status de pagamento';
      
      if (cacheInfo.isSchemaCache) {
        if (cacheInfo.missingColumn) {
          mensagemErro = `Erro de configuração: coluna '${cacheInfo.missingColumn}' não encontrada. Contate o administrador.`;
        } else {
          mensagemErro = 'Erro de cache do banco de dados. Tente novamente em alguns instantes.';
        }
      } else if (error instanceof Error && error.message.includes('406')) {
        mensagemErro = 'Erro de permissão. Verifique se você tem acesso para atualizar participantes.';
      } else {
        mensagemErro = traduzirErroSupabase(error) || mensagemErro;
      }
      
      set({
        error: mensagemErro,
        loading: false
      });
      
      throw new Error(mensagemErro);
    }
  },

  deleteParticipant: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ParticipantsService.delete(id);

      // Remove o participante da lista
      const eventParticipants = get().eventParticipants.filter(
        participant => participant.id !== id
      );

      set({ eventParticipants, loading: false });    } catch (error) {      
      console.error(`Erro ao excluir participante ${id}:`, error);
      const mensagemErro = traduzirErroSupabase(error) || 'Falha ao excluir participante';
      set({
        error: mensagemErro,
        loading: false
      });
      
      // Lançar um erro com a mensagem traduzida
      const erroTraduzido = new Error(mensagemErro);
      throw erroTraduzido;
    }
  },

  clearError: () => set({ error: null })
}));
