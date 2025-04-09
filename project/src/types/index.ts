export enum EventType {
  TOURNAMENT = 'TOURNAMENT',
  POOL = 'POOL'
}

export enum TeamFormationType {
  FORMED = 'FORMED',
  RANDOM = 'RANDOM'
}

export interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  price: number;
  maxParticipants: number;
  prize: string;
  rules: string;
  bannerImageUrl: string;
  teamFormation: TeamFormationType;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  eventName?: string;
  name: string;
  email: string;
  phone: string;
  partnerId: string | null;
  paymentStatus: 'PENDING' | 'CONFIRMED';
  paymentId?: string;
  paymentDate?: string;
  registeredAt: string;
}

export interface Match {
  id: string;
  eventId: string;
  round: number;
  position: number;
  team1: string[] | null;
  team2: string[] | null;
  score1?: number;
  score2?: number;
  winnerId?: string | null;
  completed: boolean;
  scheduledTime?: string;
}

export interface Tournament {
  id: string;
  eventId: string;
  rounds: number;
  status: 'CREATED' | 'STARTED' | 'FINISHED';
  matches: Match[];
}

export interface FinancialTransaction {
  id: string;
  eventId: string;
  eventName?: string;
  participantId?: string | null;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  paymentMethod: 'PIX' | 'CARD' | 'CASH' | 'OTHER';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  transactionDate: string;
}
