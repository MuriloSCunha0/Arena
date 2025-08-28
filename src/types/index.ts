import { BeachTennisScore } from './tournament';

export enum EventType {
  TOURNAMENT = 'TOURNAMENT',
  POOL = 'POOL',
  FRIENDLY = 'FRIENDLY',
  CHAMPIONSHIP = 'CHAMPIONSHIP',
  SUPER8 = 'SUPER8', // Novo tipo para eventos Super 8
}

export enum TeamFormationType {
  FORMED = 'FORMED',
  RANDOM = 'RANDOM',
  SUPER8 = 'SUPER8', // Formação específica para Super 8
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ONGOING';

export interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  price: number;
  maxParticipants: number;
  minParticipants?: number;
  currentParticipants?: number;
  prize: string;
  prizePool?: number;
  prizeDistribution?: Record<string, any>;
  rules: string;
  bannerImageUrl: string;
  images?: string[];
  teamFormation: TeamFormationType;
  format?: TournamentFormat;
  categories: string[];
  ageRestrictions?: Record<string, any>;
  skillLevel?: string;
  additionalInfo?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  courts?: Court[]; 
  courtIds?: string[]; 
  organizerId?: string;
  organizerCommissionRate?: number;
  organizer?: Organizer;
  status?: EventStatus;
  settings?: TournamentSettings;
  entry_fee?: number; // Manter para compatibilidade
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
  paymentAmount?: number;
  pixPaymentCode?: string;
  pixQrcodeUrl?: string;
  paymentTransactionId?: string;
  registeredAt: string;
  birthDate?: string | null;
  partnerName?: string | null;
  ranking?: number;
  seedNumber?: number;
  category?: string;
  skillLevel?: string;
  finalPosition?: number;
  eliminatedInRound?: string;
  pointsScored?: number;
  pointsAgainst?: number;
  matchesPlayed?: number;
  matchesWon?: number;
  matchesLost?: number;
  setsWon?: number;
  setsLost?: number;
  registrationNotes?: string;
  medicalNotes?: string;
  metadata?: Record<string, any>;
}

export interface PartnerInvite {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  eventId: string;
  eventName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  message?: string;
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
  type: 'PADEL' | 'BEACH_TENNIS' | 'TENNIS' | 'FUTSAL' | 'VOLLEYBALL' | 'OTHER';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  surface?: string;
  indoor: boolean;
  lighting?: boolean;    // Campo do banco
  active: boolean;
  imageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Campos com nomes corretos do banco
  lengthMeters?: number;   // length_meters no banco
  widthMeters?: number;    // width_meters no banco
  hourlyRate?: number;     // hourly_rate no banco
  images?: string[];       // jsonb no banco
  equipment?: string[];    // jsonb no banco
  address?: any;           // jsonb no banco
  settings?: any;          // jsonb no banco
}

export interface CourtReservation {
  id: string;
  courtId: string;
  eventId?: string;
  matchId?: string;
  title: string;
  start: string;
  end: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
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
export type match_stage = 'GROUP' | 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'THIRD_PLACE' | 'FINALS' | 'ELIMINATION';
export type match_status = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'WALKOVER' | 'FORFEIT';
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
  GROUP_STAGE_ELIMINATION = 'GROUP_STAGE_ELIMINATION',
  SUPER8 = 'SUPER8', // Novo formato para Super 8
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
  teamId: string[];
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  gameDifference: number;
  matchesPlayed: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
  points: number;
  draws: number;
  headToHeadWins: { [opponentTeamKey: string]: boolean };
  // Add missing properties for Beach Tennis
  proportionalWins?: number;
  proportionalGameDifference?: number;
  proportionalGamesWon?: number;
  groupNumber?: number; // Add group number for compatibility
  headToHead?: Map<string, { wins: number; gamesWon: number; gamesLost: number }>; // Make properties required, not optional
}

export interface GroupRanking {
  teamId: string[];
  team?: string; // Make optional for compatibility
  rank: number;
  position: number; // Add the missing position property
  stats: GroupTeamStats;
  groupNumber?: number;
}

export interface OverallRanking {
  teamId: string[];
  team: string; // Required for Beach Tennis rules
  rank: number;
  stats: {
    wins: number;
    losses: number;
    matchesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gameDifference: number;
    groupNumber: number;
    headToHead?: Map<string, { wins: number; gamesWon: number; gamesLost: number }>; // Make properties required, not optional
  };
  groupNumber: number;
  groupPosition?: number; // Add for ranking utils compatibility
}

// Add these enum types
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum PaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED'
}

export interface FinancialTransaction {
  id: string;
  eventId: string;
  eventName?: string; // Event name for display purposes
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
  description?: string;
  phone: string;
  email?: string;
  website?: string;
  pixKey?: string;
  bankDetails?: Record<string, any>;
  defaultCommissionRate: number;
  settings?: Record<string, any>;
  active: boolean;
  verified?: boolean;
  address?: Record<string, any>;
  logoUrl?: string;
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
