import { BeachTennisScore } from './tournament';

export enum EventType {
  TOURNAMENT = 'TOURNAMENT',
  POOL = 'POOL'
}

export enum TeamFormationType {
  FORMED = 'FORMED',
  RANDOM = 'RANDOM',
}

export type EventStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

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
  courts?: Court[]; 
  courtIds?: string[]; 
  organizerId?: string;
  organizerCommissionRate?: number;
  organizer?: Organizer;
  status?: EventStatus;
  settings?: TournamentSettings;
  entry_fee?: number; // Adicione esta propriedade
}

export interface Participant {
  id: string;
  eventId: string;
  eventName?: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  userId: string;          // ID do usuário associado
  partnerId: string | null;
  partnerUserId?: string | null; // ID do usuário parceiro
  partnerInviteStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
  paymentStatus: 'PENDING' | 'CONFIRMED';
  partnerPaymentStatus?: 'PENDING' | 'CONFIRMED' | null;
  paymentId?: string;
  paymentDate?: string;
  registeredAt: string;
  pixPaymentCode?: string;
  pixQrcodeUrl?: string;
  paymentTransactionId?: string;
  birthDate?: string | null;
  partnerName?: string | null;
  ranking?: number;
}

export interface PartnerInvite {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  eventId: string;
  eventName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  expiresAt: string;
}

// Nova interface para resultados de participantes
export interface ParticipantResult {
  id: string;
  participantId: string;
  tournamentId: string;
  eventId: string;
  position: number | null;
  stage: string | null;
  points: number | null;
  eliminatedBy: string[] | null;
  notes: string | null;
  createdAt: string;
}

export interface Court {
  id: string;
  name: string;
  location: string;
  type: 'PADEL' | 'BEACH_TENNIS' | 'OTHER';
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BOOKED';
  surface?: string;
  indoor: boolean;
  active: boolean;
  imageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourtReservation {
  id: string;
  courtId: string;
  eventId?: string;
  matchId?: string;
  title: string;
  start: string;
  end: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELED';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentSettings {
  qualifiersPerGroup?: number;
  groupSize?: number;
  bracketFormat?: 'SINGLE_ELIMINATION' | 'TWO_SIDED';
  // Outras configurações conforme necessário
}

// Define enum types matching the PostgreSQL schema
export type match_stage = 'GROUP' | 'ELIMINATION';
export type tournament_status = 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELLED';

export interface Match {
  id: string;
  eventId: string;
  tournamentId: string;
  round: number;
  position: number;
  team1: string[] | null;
  team2: string[] | null;
  score1: number | null;
  score2: number | null;
  winnerId: 'team1' | 'team2' | null;
  completed: boolean;
  scheduledTime: string | null;
  courtId?: string | null;
  courtReservationId?: string | null;
  stage: match_stage; // Use the match_stage enum type from PostgreSQL
  groupNumber: number | null;
  walkover?: boolean;
  createdAt?: string;
  updatedAt?: string;
  beachTennisScore?: BeachTennisScore; // Added support for beach tennis scoring
  editable?: boolean; // Flag to control if match result can be edited even after completion
}

export interface TournamentData {
  settings: {
    groupSize: number;
    qualifiersPerGroup: number;
    thirdPlaceMatch: boolean;
    autoAdvance: boolean;
    [key: string]: any;
  };
  groups: Group[];
  matches: Match[];
  brackets: any[];
  totalRounds?: number;
  currentRound?: number;
  groupsCount?: number;
  statistics: Record<string, any>;
  metadata: Record<string, any>;
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SWISS = 'SWISS',
  GROUP_STAGE_ELIMINATION = 'GROUP_STAGE_ELIMINATION'
}

export interface Tournament {
  id: string;
  eventId: string;
  format: TournamentFormat;
  settings: {
    groupSize?: number;
    qualifiersPerGroup?: number;
    [key: string]: any;
  };
  status: 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELLED';
  totalRounds?: number;
  currentRound: number;
  groupsCount: number;
  groupsData?: Record<string, any>;
  bracketsData?: Record<string, any>;
  thirdPlaceMatch: boolean;
  autoAdvance: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Novos campos JSONB
  matchesData: Match[];
  teamsData: Team[];
  standingsData: Record<string, any>;
  eliminationBracket: Record<string, any>;
  
  // Campos para compatibilidade
  matches: Match[];
  teamFormation?: TeamFormationType;
  isNewTournament?: boolean;
}

export interface Group {
  id: string;
  name: string;
  participants: string[];
}

export interface GroupTeamStats {
  teamId: string[]; // Array of participant IDs representing the team
  wins: number;
  losses: number;
  draws?: number;  // Optional for backward compatibility
  points?: number; // Optional for backward compatibility
  gamesWon: number;
  gamesLost: number;
  gameDifference: number;
  matchesPlayed: number;
  setsWon: number;
  setsLost: number;
  groupNumber?: number; // Group number for the team
  headToHeadWins: { [opponentTeamKey: string]: boolean };
}

export interface GroupRanking {
  teamId: string[];
  rank: number;
  stats: GroupTeamStats;
}

// Add these enum types
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum PaymentMethod {
  PIX = 'PIX',
  CARD = 'CARD',
  CASH = 'CASH',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

export interface FinancialTransaction {
  id: string;
  eventId: string;
  participantId?: string;
  amount: number;
  type: TransactionType; // Now using the enum type
  description: string;
  paymentMethod: PaymentMethod; // Now using the enum type
  status: PaymentStatus; // Now using the enum type
  transactionDate: string;
  createdAt: string; // Add the missing property
  updatedAt: string; // Add the missing property
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
  organizer?: {
    id: string;
    name: string;
  };
  maxParticipants: number;
}

export interface PaymentProcessResult {
  success: boolean;
  message: string;
  transactionId?: string;
  paymentCode?: string;
  qrcodeUrl?: string;
}

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

export interface CreateParticipantDTO {
  eventId: string;
  name: string;
  cpf: string; // Novo campo CPF obrigatório
  phone: string; // Identificador principal
  email?: string; // Email agora é opcional
  birthDate?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  paymentStatus?: 'PENDING' | 'CONFIRMED';
  paymentMethod?: string | null;
  paymentId?: string | null;
  userId?: string; // ID do usuário do sistema, se selecionado
}

// Interfaces adicionais que devem ser centralizadas
export interface EventOrganizer {
  id: string;
  eventId: string;
  userId: string;
  role: 'ADMIN' | 'ORGANIZER' | 'ASSISTANT';
  permissions?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface FetchedEventData {
  id: string;
  title: string;
  team_formation: TeamFormationType;
  max_participants: number;
  type: EventType;
}

export interface NotificationType {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export interface Team {
  id: string;
  participants: string[]; // Array de IDs dos participantes
  name?: string;
  seed?: number;
  groupNumber?: number;
  stats?: {
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
  };
}

export interface TeamWithNames extends Team {
  player1Name: string;
  player2Name?: string;
}

// Nova interface para convites de dupla
export interface PartnerInvite {
  id: string;
  eventId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  expiresAt: string;
}

export interface EventDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time?: string;
  price: number;
  entry_fee?: number; // Adicionar esta propriedade
  max_participants: number;
  banner_image_url?: string;
  team_formation: 'FORMED' | 'RANDOM';
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  organizers?: any;
  pix_key?: string;
}

// Definir os tipos de torneio como constantes em vez de depender do banco
export const TOURNAMENT_TYPES = {
  GROUPS_KNOCKOUT: 'GROUPS_KNOCKOUT',
  SINGLE_ELIMINATION: 'SINGLE_ELIMINATION', 
  DOUBLE_ELIMINATION: 'DOUBLE_ELIMINATION',
  ROUND_ROBIN: 'ROUND_ROBIN'
} as const;

export type TournamentType = typeof TOURNAMENT_TYPES[keyof typeof TOURNAMENT_TYPES];
