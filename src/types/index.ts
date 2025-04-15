export enum EventType {
  TOURNAMENT = 'TOURNAMENT',
  POOL = 'POOL'
}

export enum TeamFormationType {
  FORMED = 'FORMED',
  RANDOM = 'RANDOM'
}

export type EventStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'; // Added EventStatus

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
  courts?: Court[]; // Array of courts associated with the event
  courtIds?: string[]; // Used for form handling
  organizerId?: string;
  organizerCommissionRate?: number;
  organizer?: Organizer; // For loaded relationships
  status?: EventStatus; // Add status to Event type
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
  pixPaymentCode?: string;
  pixQrcodeUrl?: string;
  paymentTransactionId?: string;
  birthDate?: string | null; // Added birthDate
  partnerName?: string | null;
}

/**
 * Tipo para uma quadra esportiva
 */
export interface Court {
  id: string;
  name: string;
  location: string;
  type: 'PADEL' | 'BEACH_TENNIS' | 'OTHER'; // Add missing type property
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BOOKED'; // Add missing status property
  surface?: string; // tipo de superfície: saibro, grama sintética, etc.
  indoor: boolean;
  active: boolean;
  imageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tipo para uma reserva de quadra
 */
export interface CourtReservation {
  id: string;
  courtId: string;
  eventId?: string;
  matchId?: string;
  title: string;
  start: string; // formato ISO
  end: string; // formato ISO
  status: 'CONFIRMED' | 'PENDING' | 'CANCELED';
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  eventId: string;
  round: number;
  position: number;
  team1: string[] | null;
  team2: string[] | null;
  score1: number | null;
  score2: number | null;
  winnerId: 'team1' | 'team2' | null;
  completed: boolean;
  scheduledTime: string | null;
  courtId?: string | null; // Make courtId optional
  courtReservationId?: string | null; // Add court reservation ID
}

export interface Tournament {
  id: string;
  eventId: string;
  rounds: number;
  // Add 'CANCELLED' to the status union type
  status: 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELLED';
  matches: Match[];
  visualizationData?: any;
  bracketGenerationTime?: string;
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

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    role?: string;
  };
}

/**
 * Tipo para organizadores de eventos
 */
export interface Organizer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  pixKey?: string;
  defaultCommissionRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  organizerCommission: number;
  registeredParticipants: number;
  confirmedParticipants: number;
  
  // Add the missing properties
  organizer?: {
    id: string;
    name: string;
  };
  maxParticipants: number;
}

/**
 * Payment processing status
 */
export interface PaymentProcessResult {
  success: boolean;
  message: string;
  transactionId?: string;
  paymentCode?: string;
  qrcodeUrl?: string;
}

/**
 * Team Formation Animation Data
 */
export interface TeamFormationAnimation {
  teams: {
    id: string;
    members: {
      id: string;
      name: string;
      avatarUrl?: string;
    }[];
  }[];
  courts: {
    id: string;
    name: string;
    matches: {
      id: string;
      team1Id: string;
      team2Id: string;
      scheduledTime?: string;
    }[];
  }[];
}

// DTO for creating participants (used by forms/services)
export interface CreateParticipantDTO {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string | null; // Added birthDate
  partnerId?: string | null;
  paymentStatus?: 'PENDING' | 'CONFIRMED'; // Usually starts PENDING
  paymentMethod?: string | null;
  paymentId?: string | null;
}
