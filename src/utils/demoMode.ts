import { EventType } from '../types';

// Função para verificar se estamos em modo demonstração (GitHub Pages)
export const isDemoMode = (): boolean => {
  return (
    process.env.NODE_ENV === 'production' && 
    (window.location.hostname.includes('github.io') || 
     localStorage.getItem('demo_mode') === 'true')
  );
};

// Ativar modo demo manualmente (útil para testes)
export const enableDemoMode = (): void => {
  localStorage.setItem('demo_mode', 'true');
  window.location.reload();
};

// Desativar modo demo
export const disableDemoMode = (): void => {
  localStorage.removeItem('demo_mode');
  window.location.reload();
};

// Dados de demonstração para eventos
export const getDemoEvents = () => [
  {
    id: 'demo-event-1',
    title: 'Torneio de Futsal',
    description: 'Torneio amistoso entre equipes locais',
    type: EventType.TOURNAMENT,
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias a partir de hoje
    time: '14:00',
    location: 'Quadra Central',
    maxParticipants: 16,
    entryFee: 50,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-event-2',
    title: 'Bolão Copa América',
    description: 'Bolão para os jogos da Copa América 2024',
    type: EventType.POOL,
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 dias a partir de hoje
    time: '20:00',
    location: 'Online',
    maxParticipants: 50,
    entryFee: 30,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-event-3',
    title: 'Torneio de Vôlei',
    description: 'Torneio de vôlei de praia',
    type: EventType.TOURNAMENT,
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 dias a partir de hoje
    time: '09:00',
    location: 'Praia Central',
    maxParticipants: 24,
    entryFee: 40,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  }
];

// Dados de demonstração para participantes
export const getDemoParticipants = () => [
  {
    id: 'demo-participant-1',
    eventId: 'demo-event-1',
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '(11) 99999-1234',
    paymentStatus: 'CONFIRMED',
    registrationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    team: 'Time A',
  },
  {
    id: 'demo-participant-2',
    eventId: 'demo-event-1',
    name: 'Maria Oliveira',
    email: 'maria@example.com',
    phone: '(11) 99999-5678',
    paymentStatus: 'CONFIRMED',
    registrationDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    team: 'Time B',
  },
  {
    id: 'demo-participant-3',
    eventId: 'demo-event-2',
    name: 'Pedro Santos',
    email: 'pedro@example.com',
    phone: '(11) 99999-9012',
    paymentStatus: 'PENDING',
    registrationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-participant-4',
    eventId: 'demo-event-3',
    name: 'Ana Costa',
    email: 'ana@example.com',
    phone: '(11) 99999-3456',
    paymentStatus: 'CONFIRMED',
    registrationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    team: 'Time C',
  },
];

// Dados de demonstração para transações financeiras
export const getDemoTransactions = () => [
  {
    id: 'demo-transaction-1',
    eventId: 'demo-event-1',
    description: 'Inscrição - Torneio de Futsal',
    amount: 50,
    type: 'INCOME',
    status: 'CONFIRMED',
    paymentMethod: 'CREDIT_CARD',
    transactionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    eventName: 'Torneio de Futsal',
    participantId: 'demo-participant-1',
  },
  {
    id: 'demo-transaction-2',
    eventId: 'demo-event-1',
    description: 'Inscrição - Torneio de Futsal',
    amount: 50,
    type: 'INCOME',
    status: 'CONFIRMED',
    paymentMethod: 'PIX',
    transactionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    eventName: 'Torneio de Futsal',
    participantId: 'demo-participant-2',
  },
  {
    id: 'demo-transaction-3',
    eventId: 'demo-event-2',
    description: 'Inscrição - Bolão Copa América',
    amount: 30,
    type: 'INCOME',
    status: 'PENDING',
    paymentMethod: 'BANK_TRANSFER',
    transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    eventName: 'Bolão Copa América',
    participantId: 'demo-participant-3',
  },
  {
    id: 'demo-transaction-4',
    eventId: 'demo-event-3',
    description: 'Inscrição - Torneio de Vôlei',
    amount: 40,
    type: 'INCOME',
    status: 'CONFIRMED',
    paymentMethod: 'CREDIT_CARD',
    transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    eventName: 'Torneio de Vôlei',
    participantId: 'demo-participant-4',
  },
  {
    id: 'demo-transaction-5',
    eventId: 'demo-event-1',
    description: 'Aluguel de quadra',
    amount: 200,
    type: 'EXPENSE',
    status: 'CONFIRMED',
    paymentMethod: 'BANK_TRANSFER',
    transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    eventName: 'Torneio de Futsal',
  },
];
