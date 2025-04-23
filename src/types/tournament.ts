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
}

// Extend your Match interface
export interface Match {
  // existing fields
  groupId?: string;
  isGroupMatch?: boolean;
  walkover?: boolean; // For WO matches
}

// Match formats as per beach tennis rules
export enum MatchFormat {
  GROUP_STAGE = 'GROUP_STAGE',       // 1 set with tiebreak at 6-6
  ELIMINATION_EARLY = 'ELIMINATION_EARLY', // Best of 3 sets, 4 games per set, TB7
  ELIMINATION_FINAL = 'ELIMINATION_FINAL'  // Best of 3 sets, 4 games per set, MTB10
}