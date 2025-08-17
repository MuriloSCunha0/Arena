/**
 * Tipos TypeScript corrigidos para aderência total ao DDL PostgreSQL
 * Arquivo: types/database.ts
 * 
 * Este arquivo contém as interfaces que espelham exatamente a estrutura do banco
 * PostgreSQL conforme definido no schema.sql
 */

// ========================================
// ENUMS DO BANCO (conforme DDL)
// ========================================

export type CourtStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
export type CourtType = 'PADEL' | 'BEACH_TENNIS' | 'TENNIS' | 'FUTSAL' | 'VOLLEYBALL' | 'OTHER';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type EventType = 'TOURNAMENT' | 'POOL' | 'FRIENDLY' | 'CHAMPIONSHIP';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type MatchStage = 'GROUP' | 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'THIRD_PLACE' | 'FINALS' | 'ELIMINATION';
export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'WALKOVER' | 'FORFEIT';
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'payment' | 'match' | 'event';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
export type ReservationStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type TeamFormationType = 'FORMED' | 'RANDOM' | 'DRAFT';
export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS' | 'GROUP_STAGE_ELIMINATION'| 'SUPER8';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'REFUND' | 'COMMISSION';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

// ========================================
// INTERFACES PRINCIPAIS (baseadas no DDL)
// ========================================

/**
 * Interface Events - espelha exatamente a tabela events do DDL
 */
export interface DatabaseEvent {
  id: string;
  title: string;  // ✅ Corrigido: era 'name' no código antigo
  description: string | null;
  type: EventType;
  tournament_format: TournamentFormat | null;
  team_formation: TeamFormationType;
  max_participants: number;
  min_participants: number;
  current_participants: number;
  categories: string[] | null;
  age_restrictions: Record<string, any> | null;
  skill_level: string | null;
  location: string;
  date: string; // date
  time: string; // time
  end_date: string | null; // date
  end_time: string | null; // time
  entry_fee: number; // ✅ Corrigido: era 'price' no código antigo
  prize_pool: number | null;
  prize_distribution: Record<string, any> | null;
  organizer_id: string | null;
  organizer_commission_rate: number | null;
  court_ids: string[] | null;
  rules: string | null;
  additional_info: Record<string, any> | null;
  banner_image_url: string | null;
  images: string[] | null;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface Participants - espelha exatamente a tabela participants do DDL
 * ✅ Corrigido: usar 'participants' não 'event_participants'
 */
export interface DatabaseParticipant {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string;
  cpf: string;
  birth_date: string | null; // date
  partner_id: string | null;
  partner_name: string | null;
  team_name: string | null;
  seed_number: number | null;
  category: string | null;
  skill_level: string | null;
  payment_id: string | null;
  payment_date: string | null; // timestamptz
  payment_amount: number | null;
  pix_payment_code: string | null;
  pix_qrcode_url: string | null;
  final_position: number | null;
  eliminated_in_round: string | null;
  
  // ✅ Estatísticas específicas por evento (campos do DDL)
  points_scored: number;
  points_against: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  
  registration_notes: string | null;
  medical_notes: string | null;
  metadata: Record<string, any> | null;
  registered_at: string;
  updated_at: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
}

/**
 * Interface Tournaments - espelha exatamente a tabela tournaments do DDL
 */
export interface DatabaseTournament {
  id: string;
  event_id: string;
  format: TournamentFormat;
  settings: Record<string, any> | null;
  status: string | null;
  total_rounds: number | null;
  current_round: number;
  groups_count: number;
  groups_data: Record<string, any> | null;
  brackets_data: Record<string, any> | null;
  third_place_match: boolean | null;
  auto_advance: boolean | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  team_formation: TeamFormationType | null;
  type: TournamentFormat | null;
  
  // ✅ Campos JSONB para dados do torneio (conforme DDL)
  matches_data: DatabaseMatchJsonb[] | null;
  teams_data: DatabaseTeamJsonb[] | null;
  standings_data: Record<string, any> | null;
  elimination_bracket: Record<string, any> | null;
  stage: string | null;
}

/**
 * Interface Matches - espelha exatamente a tabela matches do DDL
 */
export interface DatabaseMatch {
  id: string;
  event_id: string;
  tournament_id: string | null;
  court_id: string | null;
  
  // ✅ Corrigido: usar arrays de UUIDs conforme DDL
  team1_ids: string[]; // _uuid no DDL
  team2_ids: string[]; // _uuid no DDL
  
  // ✅ Corrigido: usar winner_team conforme DDL
  winner_team: 'team1' | 'team2' | null; // varchar(10) no DDL
  
  round_number: number;
  match_number: number | null;
  group_number: number | null;
  team1_score: number | null;
  team2_score: number | null;
  sets_data: Record<string, any>[] | null; // jsonb array
  total_sets: number;
  status: MatchStatus | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  referee: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface Users - espelha exatamente a tabela users do DDL
 */
export interface DatabaseUser {
  id: string;
  email: string;
  password: string | null;
  full_name: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null; // date
  gender: string | null;
  address: Record<string, any> | null;
  user_metadata: Record<string, any> | null;
  app_metadata: Record<string, any> | null;
  preferences: Record<string, any> | null;
  
  // ✅ Histórico e estatísticas globais (JSONB)
  tournaments_history: Record<string, any>[] | null;
  statistics: Record<string, any> | null;
  
  status: UserStatus | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  last_login: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface Partner Invites - espelha exatamente a tabela partner_invites do DDL
 */
export interface DatabasePartnerInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  event_id: string;
  status: InviteStatus;
  expires_at: string; // timestamptz
  message: string | null;
  created_at: string;
  updated_at: string;
}

// ========================================
// INTERFACES PARA DADOS JSONB
// ========================================

/**
 * Estrutura de match no JSONB tournaments.matches_data
 */
export interface DatabaseMatchJsonb {
  id: string;
  tournamentId: string;
  eventId: string;
  round: number;
  position?: number;
  team1Ids: string[]; // ✅ Arrays conforme DDL
  team2Ids: string[]; // ✅ Arrays conforme DDL
  score1: number | null;
  score2: number | null;
  winnerId?: string | null; // Para compatibilidade com código antigo
  winnerTeam: 'team1' | 'team2' | null; // ✅ Conforme DDL
  completed: boolean;
  status?: MatchStatus;
  courtId?: string | null;
  scheduledTime?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  stage?: MatchStage | null;
  groupNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Estrutura de team no JSONB tournaments.teams_data
 */
export interface DatabaseTeamJsonb {
  id: string;
  name: string;
  participantIds: string[];
  groupId?: string;
  seedNumber?: number;
  isQualified?: boolean;
  groupPosition?: number;
  totalPoints?: number;
  matchesPlayed?: number;
  matchesWon?: number;
  matchesLost?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  pointsDifference?: number;
}

/**
 * Estrutura de standings no JSONB tournaments.standings_data
 */
export interface DatabaseStandingsJsonb {
  groups?: Record<string, DatabaseTeamJsonb[]>;
  overall?: DatabaseTeamJsonb[];
  qualified?: DatabaseTeamJsonb[];
  eliminated?: DatabaseTeamJsonb[];
  lastUpdated?: string;
}

// ========================================
// TIPOS DE RESPOSTA PARA SERVIÇOS
// ========================================

/**
 * Resposta padrão do Supabase
 */
export interface DatabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

/**
 * Resposta para operações de array
 */
export interface DatabaseArrayResponse<T> {
  data: T[] | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

// ========================================
// TIPOS AUXILIARES
// ========================================

/**
 * Configurações padrão de torneio
 */
export interface TournamentSettings {
  groupSize: number;
  qualifiersPerGroup: number;
  allowThirdPlace: boolean;
  autoAdvance: boolean;
  maxRounds?: number;
  pointsPerWin?: number;
  pointsPerDraw?: number;
  pointsPerLoss?: number;
}

/**
 * Metadados de evento
 */
export interface EventMetadata {
  maxTeams?: number;
  registrationDeadline?: string;
  allowLateRegistration?: boolean;
  requirePayment?: boolean;
  allowPartnerChange?: boolean;
  customRules?: string[];
}

/**
 * Estatísticas globais do usuário
 */
export interface UserStatistics {
  totalTournaments: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  avgPointsScored: number;
  avgPointsAgainst: number;
  bestPosition: number;
  favoritePartner?: string;
  strongestCategory?: string;
  lastActive: string;
}

// ========================================
// EXPORTS PARA COMPATIBILIDADE
// ========================================

// Aliases para compatibilidade com código existente
export type Event = DatabaseEvent;
export type Participant = DatabaseParticipant;
export type Tournament = DatabaseTournament;
export type Match = DatabaseMatch;
export type User = DatabaseUser;
export type PartnerInvite = DatabasePartnerInvite;
