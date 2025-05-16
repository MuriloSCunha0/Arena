// Add these types to your types folder

export interface Group {
  id: string;
  name: string;
  participants: string[]; // Participant IDs
}

export interface GroupRanking {
  id: string;
  wins: number;
  losses: number;
  scored: number;
  conceded: number;
}

// Extend your Tournament interface
export interface Tournament {
  // existing fields
  groups?: Group[];
  hasEliminationStage?: boolean;
  allGroupMatchesComplete?: boolean;
  bracketFormat?: BracketFormat; // Add the bracket format field
  bracketSides?: {
    left: string[][]; // Team IDs on the left side
    right: string[][]; // Team IDs on the right side
  };
}

// Extend your Match interface - Note: The main Match interface is in index.ts
// This just adds additional fields specific to tournament matches
export interface TournamentMatch {
  groupId?: string;
  isGroupMatch?: boolean;
}

// Match formats as per beach tennis rules
export enum MatchFormat {
  GROUP_STAGE = 'GROUP_STAGE',       // 1 set with tiebreak at 6-6
  ELIMINATION_EARLY = 'ELIMINATION_EARLY', // Best of 3 sets, 4 games per set, TB7
  ELIMINATION_FINAL = 'ELIMINATION_FINAL'  // Best of 3 sets, 4 games per set, MTB10
}

// Add new categories and scoring systems for Beach Tennis
export enum TournamentCategory {
  PROFESSIONAL = 'PROFESSIONAL',
  AMATEUR_ADVANCED = 'AMATEUR_ADVANCED',
  AMATEUR_INTERMEDIATE = 'AMATEUR_INTERMEDIATE',
  AMATEUR_BEGINNER = 'AMATEUR_BEGINNER',
  MIXED = 'MIXED'
}

export enum ScoringSystem {
  FULL_SETS = 'FULL_SETS',              // Sets completos (6 games)
  SHORT_SETS = 'SHORT_SETS',            // Sets curtos (4 games)
  SINGLE_SET = 'SINGLE_SET',            // Set único
  TIMED_MATCH = 'TIMED_MATCH',          // Partida com tempo determinado
  POINTS_CAP = 'POINTS_CAP'             // Até X pontos (ex: 21)
}

export enum BracketFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',       // Eliminatória simples
  CONSOLATION = 'CONSOLATION',                     // Consolação ou espelho
  CONSOLATION_FINAL = 'CONSOLATION_FINAL',         // Consolação com grande final
  DOUBLE_CONSOLATION = 'DOUBLE_CONSOLATION',       // Dupla consolação
  GROUP = 'GROUP',                                 // Apenas grupos
  MASTERS = 'MASTERS',                             // Masters ou finals (misto)
  MULTI_GROUP = 'MULTI_GROUP',                     // Multigrupo
  REPECHAGE = 'REPECHAGE',                         // Repescagem
  QUALIFYING = 'QUALIFYING',                       // Classificatória
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',       // Dupla eliminação
  TWO_SIDED = 'TWO_SIDED'                          // Chaveamento em dois lados (esquerdo e direito)
}

export interface TournamentFormatSettings {
  category: TournamentCategory;
  scoringSystem: ScoringSystem;
  setsToWin: number;
  gamesPerSet: number;
  tiebreakAtGames?: number;
  useFinalSetTiebreak?: boolean;
  finalSetTiebreakPoints?: number;
  timeLimitMinutes?: number;
  pointsCap?: number;
  bracketFormat?: BracketFormat; // Add bracket format to settings
}

export interface BeachTennisScore {
  sets: Array<{
    team1Games: number;
    team2Games: number;
    tiebreak?: {
      team1Points: number;
      team2Points: number;
    }
  }>;
  completed: boolean;
  winnerId: 'team1' | 'team2' | null;
  incidentReport?: string; // Optional field for recording match incidents
}

// Add categories and divisions for tournaments
export interface EventCategorySettings {
  categoryId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
  ageGroup?: 'UNDER_18' | 'ADULT' | 'SENIOR';
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
  maxTeams?: number;
  tournamentFormat?: TournamentFormatSettings;
}