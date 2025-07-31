import { supabase } from '../lib/supabase';

export interface TestTournament {
  id: string;
  name: string;
  category: string;
  description?: string;
  stage: 'SETUP' | 'GROUP_STAGE' | 'ELIMINATION';
  status: 'PENDING' | 'STARTED' | 'COMPLETED';
  settings?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface TestParticipant {
  id: string;
  tournament_id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  category: string;
  user_id?: string;
  partner_id?: string;
  payment_status: string;
  registered_at: string;
  created_at: string;
}

export interface TestTeam {
  id: string;
  tournament_id: string;
  name?: string;
  player1_id: string;
  player2_id: string;
  seed_number?: number;
  is_bye: boolean;
  formation_type: string;
  created_at: string;
  // Campos virtuais das views
  player1_name?: string;
  player2_name?: string;
  display_name?: string;
}

export interface TestGroup {
  id: string;
  tournament_id: string;
  group_number: number;
  group_name?: string;
  max_teams: number;
  settings?: any;
  created_at: string;
  teams?: TestTeam[];
}

export interface TestMatch {
  id: string;
  tournament_id: string;
  team1_id?: string;
  team2_id?: string;
  winner_id?: string;
  stage: string;
  round_number: number;
  match_number?: number;
  position?: number;
  group_id?: string;
  score1?: number;
  score2?: number;
  sets_score?: any;
  games_score?: any;
  completed: boolean;
  walkover: boolean;
  forfeit: boolean;
  court_name?: string;
  scheduled_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  parent_match1_id?: string;
  parent_match2_id?: string;
  next_match_id?: string;
  notes?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  // Campos virtuais das views
  team1_name?: string;
  team2_name?: string;
  winner_name?: string;
  group_number?: number;
  group_name?: string;
}

export interface TestGroupStanding {
  id: string;
  group_id: string;
  team_id: string;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  games_won: number;
  games_lost: number;
  game_difference: number;
  sets_won: number;
  sets_lost: number;
  set_difference: number;
  points: number;
  position?: number;
  qualified: boolean;
  head_to_head_wins: number;
  updated_at: string;
  // Campos virtuais das views
  team_name?: string;
  group_number?: number;
  group_name?: string;
  qualifies_for_elimination?: boolean;
}

export class TestTournamentService {
  // ===================================================
  // GERENCIAMENTO DE TORNEIOS
  // ===================================================

  static async createTournament(data: {
    name: string;
    category: string;
    description?: string;
  }): Promise<TestTournament> {
    const { data: tournament, error } = await supabase
      .from('test_tournaments')
      .insert([{
        name: data.name,
        category: data.category,
        description: data.description,
      }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar torneio: ${error.message}`);

    await this.logAction(tournament.id, 'TOURNAMENT_CREATED', `Torneio "${data.name}" criado`);
    
    return tournament;
  }

  static async getTournament(id: string): Promise<TestTournament | null> {
    const { data, error } = await supabase
      .from('test_tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar torneio: ${error.message}`);
    }

    return data;
  }

  static async getAllTournaments(): Promise<TestTournament[]> {
    const { data, error } = await supabase
      .from('test_tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar torneios: ${error.message}`);
    
    return data || [];
  }

  static async updateTournament(id: string, updates: Partial<TestTournament>): Promise<TestTournament> {
    const { data, error } = await supabase
      .from('test_tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar torneio: ${error.message}`);

    await this.logAction(id, 'TOURNAMENT_UPDATED', 'Torneio atualizado');
    
    return data;
  }

  static async deleteTournament(id: string): Promise<void> {
    const { error } = await supabase
      .from('test_tournaments')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar torneio: ${error.message}`);
  }

  // ===================================================
  // GERENCIAMENTO DE PARTICIPANTES
  // ===================================================

  static async addParticipant(tournamentId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    category?: string;
  }): Promise<TestParticipant> {
    const { data: participant, error } = await supabase
      .from('test_participants')
      .insert([{
        tournament_id: tournamentId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        category: data.category || 'OPEN',
      }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar participante: ${error.message}`);

    await this.logAction(tournamentId, 'PARTICIPANT_ADDED', `Participante "${data.name}" adicionado`);
    
    return participant;
  }

  static async getParticipants(tournamentId: string): Promise<TestParticipant[]> {
    const { data, error } = await supabase
      .from('test_participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name');

    if (error) throw new Error(`Erro ao buscar participantes: ${error.message}`);
    
    return data || [];
  }

  static async removeParticipant(participantId: string): Promise<void> {
    const { error } = await supabase
      .from('test_participants')
      .delete()
      .eq('id', participantId);

    if (error) throw new Error(`Erro ao remover participante: ${error.message}`);
  }

  // ===================================================
  // GERENCIAMENTO DE DUPLAS/EQUIPES
  // ===================================================

  static async createTeam(tournamentId: string, data: {
    player1_id: string;
    player2_id: string;
    name?: string;
    seed_number?: number;
  }): Promise<TestTeam> {
    const { data: team, error } = await supabase
      .from('test_teams')
      .insert([{
        tournament_id: tournamentId,
        player1_id: data.player1_id,
        player2_id: data.player2_id,
        name: data.name,
        seed_number: data.seed_number,
      }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar dupla: ${error.message}`);

    await this.logAction(tournamentId, 'TEAM_CREATED', `Dupla criada`);
    
    return team;
  }

  static async getTeams(tournamentId: string): Promise<TestTeam[]> {
    const { data, error } = await supabase
      .from('v_test_teams_with_players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at');

    if (error) throw new Error(`Erro ao buscar duplas: ${error.message}`);
    
    return data || [];
  }

  static async getTeamsInGroup(groupId: string): Promise<TestTeam[]> {
    const { data, error } = await supabase
      .from('test_group_teams')
      .select(`
        team_id,
        position,
        test_teams:test_teams(*)
      `)
      .eq('group_id', groupId)
      .order('position');

    if (error) throw new Error(`Erro ao buscar duplas do grupo: ${error.message}`);
    
    return data?.map((item: any) => item.test_teams as TestTeam).filter(Boolean) || [];
  }

  // ===================================================
  // GERENCIAMENTO DE GRUPOS
  // ===================================================

  static async createGroup(tournamentId: string, data: {
    group_number: number;
    group_name?: string;
    max_teams?: number;
  }): Promise<TestGroup> {
    const { data: group, error } = await supabase
      .from('test_groups')
      .insert([{
        tournament_id: tournamentId,
        group_number: data.group_number,
        group_name: data.group_name,
        max_teams: data.max_teams || 4,
      }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar grupo: ${error.message}`);

    await this.logAction(tournamentId, 'GROUP_CREATED', `Grupo ${data.group_number} criado`);
    
    return group;
  }

  static async getGroups(tournamentId: string): Promise<TestGroup[]> {
    const { data, error } = await supabase
      .from('test_groups')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('group_number');

    if (error) throw new Error(`Erro ao buscar grupos: ${error.message}`);
    
    return data || [];
  }

  static async addTeamToGroup(groupId: string, teamId: string, position?: number): Promise<void> {
    const { error } = await supabase
      .from('test_group_teams')
      .insert([{
        group_id: groupId,
        team_id: teamId,
        position: position,
      }]);

    if (error) throw new Error(`Erro ao adicionar dupla ao grupo: ${error.message}`);
  }

  static async createGroupsAutomatically(tournamentId: string, teamsPerGroup: number = 4): Promise<TestGroup[]> {
    // Buscar duplas não agrupadas
    const teams = await this.getTeams(tournamentId);
    const existingGroups = await this.getGroups(tournamentId);
    
    // Determinar quais duplas já estão em grupos
    const teamsInGroups = new Set();
    for (const group of existingGroups) {
      const groupTeams = await this.getTeamsInGroup(group.id);
      groupTeams.forEach(team => teamsInGroups.add(team.id));
    }
    
    const availableTeams = teams.filter(team => !teamsInGroups.has(team.id));
    
    if (availableTeams.length === 0) {
      return existingGroups;
    }
    
    const newGroups: TestGroup[] = [];
    let groupNumber = Math.max(0, ...existingGroups.map(g => g.group_number)) + 1;
    
    for (let i = 0; i < availableTeams.length; i += teamsPerGroup) {
      const groupTeams = availableTeams.slice(i, i + teamsPerGroup);
      
      const group = await this.createGroup(tournamentId, {
        group_number: groupNumber,
        group_name: `Grupo ${groupNumber}`,
        max_teams: teamsPerGroup,
      });
      
      // Adicionar duplas ao grupo
      for (let j = 0; j < groupTeams.length; j++) {
        await this.addTeamToGroup(group.id, groupTeams[j].id, j + 1);
      }
      
      newGroups.push(group);
      groupNumber++;
    }
    
    await this.logAction(tournamentId, 'GROUPS_AUTO_CREATED', `${newGroups.length} grupos criados automaticamente`);
    
    return [...existingGroups, ...newGroups];
  }

  // ===================================================
  // GERENCIAMENTO DE PARTIDAS
  // ===================================================

  static async createMatch(tournamentId: string, data: {
    team1_id?: string;
    team2_id?: string;
    stage: string;
    round_number?: number;
    match_number?: number;
    position?: number;
    group_id?: string;
    court_name?: string;
    scheduled_time?: string;
  }): Promise<TestMatch> {
    const { data: match, error } = await supabase
      .from('test_matches')
      .insert([{
        tournament_id: tournamentId,
        ...data,
      }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar partida: ${error.message}`);
    
    return match;
  }

  static async getMatches(tournamentId: string, stage?: string): Promise<TestMatch[]> {
    let query = supabase
      .from('v_test_matches_complete')
      .select('*')
      .eq('tournament_id', tournamentId);
    
    if (stage) {
      query = query.eq('stage', stage);
    }
    
    const { data, error } = await query.order('round_number').order('match_number');

    if (error) throw new Error(`Erro ao buscar partidas: ${error.message}`);
    
    return data || [];
  }

  static async updateMatchResult(matchId: string, data: {
    score1: number;
    score2: number;
    sets_score?: any;
    games_score?: any;
    notes?: string;
  }): Promise<TestMatch> {
    const winnerId = data.score1 > data.score2 ? 'team1_id' : 'team2_id';
    
    const { data: match, error } = await supabase
      .from('test_matches')
      .update({
        score1: data.score1,
        score2: data.score2,
        sets_score: data.sets_score,
        games_score: data.games_score,
        notes: data.notes,
        completed: true,
        actual_end_time: new Date().toISOString(),
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar resultado: ${error.message}`);

    // Atualizar vencedor
    const { error: winnerError } = await supabase
      .from('test_matches')
      .update({ winner_id: match[winnerId] })
      .eq('id', matchId);

    if (winnerError) throw new Error(`Erro ao definir vencedor: ${winnerError.message}`);

    // Se for partida de grupo, recalcular classificação
    if (match.group_id) {
      await this.calculateGroupStandings(match.group_id);
    }

    await this.logAction(match.tournament_id, 'MATCH_RESULT_UPDATED', 
      `Resultado atualizado: ${data.score1} x ${data.score2}`);
    
    return match;
  }

  static async generateGroupMatches(tournamentId: string): Promise<TestMatch[]> {
    const groups = await this.getGroups(tournamentId);
    const matches: TestMatch[] = [];
    
    for (const group of groups) {
      const teams = await this.getTeamsInGroup(group.id);
      
      // Gerar partidas round-robin
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const match = await this.createMatch(tournamentId, {
            team1_id: teams[i].id,
            team2_id: teams[j].id,
            stage: 'GROUP',
            round_number: 1,
            group_id: group.id,
            match_number: matches.length + 1,
          });
          matches.push(match);
        }
      }
    }
    
    // Atualizar estágio do torneio
    await this.updateTournament(tournamentId, { stage: 'GROUP_STAGE', status: 'STARTED' });
    
    await this.logAction(tournamentId, 'GROUP_MATCHES_GENERATED', `${matches.length} partidas de grupo geradas`);
    
    return matches;
  }

  // ===================================================
  // CLASSIFICAÇÃO E ESTATÍSTICAS
  // ===================================================

  static async calculateGroupStandings(groupId: string): Promise<void> {
    const { error } = await supabase.rpc('calculate_test_group_standings', {
      p_group_id: groupId
    });

    if (error) throw new Error(`Erro ao calcular classificação: ${error.message}`);
  }

  static async getGroupStandings(groupId: string): Promise<TestGroupStanding[]> {
    const { data, error } = await supabase
      .from('v_test_group_standings_complete')
      .select('*')
      .eq('group_id', groupId)
      .order('position');

    if (error) throw new Error(`Erro ao buscar classificação: ${error.message}`);
    
    return data || [];
  }

  static async getQualifiedTeams(tournamentId: string, teamsPerGroup: number = 2): Promise<TestTeam[]> {
    const groups = await this.getGroups(tournamentId);
    const qualifiedTeams: TestTeam[] = [];
    
    for (const group of groups) {
      const standings = await this.getGroupStandings(group.id);
      const qualified = standings
        .filter(s => s.position && s.position <= teamsPerGroup)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      for (const standing of qualified) {
        const teams = await this.getTeams(tournamentId);
        const team = teams.find(t => t.id === standing.team_id);
        if (team) {
          qualifiedTeams.push({
            ...team,
            seed_number: qualifiedTeams.length + 1,
          });
        }
      }
    }
    
    return qualifiedTeams;
  }

  // ===================================================
  // SISTEMA DE LOGS
  // ===================================================

  static async logAction(
    tournamentId: string,
    action: string,
    description?: string,
    actor: string = 'SYSTEM',
    details: any = {}
  ): Promise<void> {
    const { error } = await supabase.rpc('log_test_tournament_action', {
      p_tournament_id: tournamentId,
      p_action: action,
      p_description: description,
      p_actor: actor,
      p_details: details
    });

    if (error) {
      console.warn('Erro ao registrar log:', error.message);
    }
  }

  static async getTournamentLogs(tournamentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('test_tournament_logs')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar logs: ${error.message}`);
    
    return data || [];
  }

  // ===================================================
  // MIGRAÇÃO DE DADOS DO LOCALSTORAGE
  // ===================================================

  static async migrateFromLocalStorage(localStorageData: any): Promise<TestTournament> {
    const tournament = await this.createTournament({
      name: localStorageData.name,
      category: localStorageData.category,
      description: localStorageData.description,
    });

    // Migrar participantes
    for (const participant of localStorageData.participants || []) {
      await this.addParticipant(tournament.id, {
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        cpf: participant.cpf,
        category: participant.category,
      });
    }

    // Migrar duplas
    const participants = await this.getParticipants(tournament.id);
    for (const team of localStorageData.teams || []) {
      const player1 = participants.find(p => p.name === localStorageData.participants.find((part: any) => part.id === team[0])?.name);
      const player2 = participants.find(p => p.name === localStorageData.participants.find((part: any) => part.id === team[1])?.name);
      
      if (player1 && player2) {
        await this.createTeam(tournament.id, {
          player1_id: player1.id,
          player2_id: player2.id,
        });
      }
    }

    // Migrar grupos se existirem
    if (localStorageData.groups && localStorageData.groups.length > 0) {
      const teams = await this.getTeams(tournament.id);
      
      for (const group of localStorageData.groups) {
        const newGroup = await this.createGroup(tournament.id, {
          group_number: group.groupNumber,
          group_name: `Grupo ${group.groupNumber}`,
        });

        // Adicionar duplas ao grupo
        for (let i = 0; i < group.teams.length; i++) {
          const localTeam = group.teams[i];
          const dbTeam = teams.find(t => {
            const localPlayer1 = localStorageData.participants.find((p: any) => p.id === localTeam[0]);
            const localPlayer2 = localStorageData.participants.find((p: any) => p.id === localTeam[1]);
            return t.player1_name === localPlayer1?.name && t.player2_name === localPlayer2?.name;
          });
          
          if (dbTeam) {
            await this.addTeamToGroup(newGroup.id, dbTeam.id, i + 1);
          }
        }
      }
    }

    // Migrar partidas se existirem
    if (localStorageData.matches && localStorageData.matches.length > 0) {
      const teams = await this.getTeams(tournament.id);
      const groups = await this.getGroups(tournament.id);
      
      for (const match of localStorageData.matches) {
        const localPlayer1Team1 = localStorageData.participants.find((p: any) => p.id === match.team1[0]);
        const localPlayer2Team1 = localStorageData.participants.find((p: any) => p.id === match.team1[1]);
        const localPlayer1Team2 = localStorageData.participants.find((p: any) => p.id === match.team2[0]);
        const localPlayer2Team2 = localStorageData.participants.find((p: any) => p.id === match.team2[1]);
        
        const dbTeam1 = teams.find(t => 
          t.player1_name === localPlayer1Team1?.name && t.player2_name === localPlayer2Team1?.name
        );
        const dbTeam2 = teams.find(t => 
          t.player1_name === localPlayer1Team2?.name && t.player2_name === localPlayer2Team2?.name
        );
        
        if (dbTeam1 && dbTeam2) {
          const group = groups.find(g => g.group_number === match.groupNumber);
          
          const newMatch = await this.createMatch(tournament.id, {
            team1_id: dbTeam1.id,
            team2_id: dbTeam2.id,
            stage: match.stage || 'GROUP',
            round_number: match.round || 1,
            group_id: group?.id,
            match_number: match.position,
          });

          // Se a partida tem resultado, atualizar
          if (match.completed && match.score1 !== null && match.score2 !== null) {
            await this.updateMatchResult(newMatch.id, {
              score1: match.score1,
              score2: match.score2,
            });
          }
        }
      }
      
      // Atualizar estágio do torneio
      await this.updateTournament(tournament.id, { 
        stage: localStorageData.stage || 'GROUP_STAGE',
        status: localStorageData.status || 'STARTED'
      });
    }

    await this.logAction(tournament.id, 'MIGRATED_FROM_LOCALSTORAGE', 
      'Torneio migrado do localStorage');

    return tournament;
  }
}
