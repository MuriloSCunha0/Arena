import { createClient } from '@supabase/supabase-js';

// Configure seu Supabase client conforme seu projeto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Team {
  name: string;
  player1_id: string;
  player2_id: string;
  tournament_id: string;
  formation_type?: string;
}

export interface Group {
  group_number: number;
  group_name?: string;
  tournament_id: string;
  team_ids: string[];
}

export async function saveRandomTeamsAndGroups(
  tournamentId: string,
  teams: Team[],
  groups: Group[]
) {
  // 1. Inserir duplas
  const { data: teamData, error: teamError } = await supabase
    .from('test_teams')
    .insert(
      teams.map(team => ({
        tournament_id: tournamentId,
        name: team.name,
        player1_id: team.player1_id,
        player2_id: team.player2_id,
        formation_type: team.formation_type || 'RANDOM',
      }))
    )
    .select();
  if (teamError) throw teamError;

  // 2. Inserir grupos
  const { data: groupData, error: groupError } = await supabase
    .from('test_groups')
    .insert(
      groups.map(group => ({
        tournament_id: tournamentId,
        group_number: group.group_number,
        group_name: group.group_name,
        max_teams: group.team_ids.length,
      }))
    )
    .select();
  if (groupError) throw groupError;

  // 3. Relacionar duplas aos grupos (precisa de tabela intermediária se existir)
  // Exemplo: test_group_teams (group_id, team_id)
  if (groupData) {
    const groupTeamRows = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupId = groupData[i]?.id;
      for (const teamId of group.team_ids) {
        groupTeamRows.push({ group_id: groupId, team_id: teamId });
      }
    }
    if (groupTeamRows.length > 0) {
      const { error: groupTeamError } = await supabase
        .from('test_group_teams')
        .insert(groupTeamRows);
      if (groupTeamError) throw groupTeamError;
    }
  }

  // 4. Atualizar status do torneio
  await supabase
    .from('test_tournaments')
    .update({ status: 'STARTED' })
    .eq('id', tournamentId);

  return { teams: teamData, groups: groupData };
}
