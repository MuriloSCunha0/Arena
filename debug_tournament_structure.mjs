// Debug script para verificar dados do torneio
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zghksfbmjikuxnlfsjec.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnaGtzZmJtamlrdXhubGZzamVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNjUzNTMsImV4cCI6MjA1MDc0MTM1M30.bCVJZT6z0C4FD1a5zO2t3y7ZxaO0Pp4pqtcjkA9Ej1E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTournamentData() {
  try {
    console.log('=== Debug dos Dados do Torneio ===\n');

    // Listar todos os eventos
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, status, current_participants')
      .limit(5);

    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      return;
    }

    console.log('Eventos encontrados:');
    events?.forEach(event => {
      console.log(`- ${event.id}: ${event.title} (${event.status})`);
    });

    if (!events || events.length === 0) {
      console.log('Nenhum evento encontrado!');
      return;
    }

    // Pegar o primeiro evento para análise
    const eventId = events[0].id;
    console.log(`\n=== Analisando evento: ${eventId} ===`);

    // Buscar dados do tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('event_id', eventId)
      .single();

    console.log('\n--- Dados do Tournament ---');
    if (tournamentError) {
      console.log('Erro ao buscar tournament:', tournamentError.message);
    } else if (!tournamentData) {
      console.log('Nenhum tournament encontrado para este evento');
    } else {
      console.log('Tournament encontrado:');
      console.log('ID:', tournamentData.id);
      console.log('Status:', tournamentData.status);
      console.log('Format:', tournamentData.format);
      console.log('Current Round:', tournamentData.current_round);
      console.log('Total Rounds:', tournamentData.total_rounds);
      console.log('Groups Count:', tournamentData.groups_count);
      
      console.log('\n--- Standings Data ---');
      if (tournamentData.standings_data) {
        console.log('Tipo:', typeof tournamentData.standings_data);
        console.log('Conteúdo:', JSON.stringify(tournamentData.standings_data, null, 2));
      } else {
        console.log('Nenhum standings_data encontrado');
      }

      console.log('\n--- Groups Data ---');
      if (tournamentData.groups_data) {
        console.log('Tipo:', typeof tournamentData.groups_data);
        console.log('Conteúdo:', JSON.stringify(tournamentData.groups_data, null, 2));
      } else {
        console.log('Nenhum groups_data encontrado');
      }

      console.log('\n--- Matches Data ---');
      if (tournamentData.matches_data) {
        console.log('Tipo:', typeof tournamentData.matches_data);
        console.log('Quantidade de matches:', Array.isArray(tournamentData.matches_data) ? tournamentData.matches_data.length : 'Não é array');
        if (Array.isArray(tournamentData.matches_data) && tournamentData.matches_data.length > 0) {
          console.log('Primeiro match:', JSON.stringify(tournamentData.matches_data[0], null, 2));
        }
      } else {
        console.log('Nenhum matches_data encontrado');
      }

      console.log('\n--- Brackets Data ---');
      if (tournamentData.brackets_data) {
        console.log('Tipo:', typeof tournamentData.brackets_data);
        console.log('Conteúdo:', JSON.stringify(tournamentData.brackets_data, null, 2));
      } else {
        console.log('Nenhum brackets_data encontrado');
      }

      console.log('\n--- Teams Data ---');
      if (tournamentData.teams_data) {
        console.log('Tipo:', typeof tournamentData.teams_data);
        console.log('Conteúdo:', JSON.stringify(tournamentData.teams_data, null, 2));
      } else {
        console.log('Nenhum teams_data encontrado');
      }
    }

    // Buscar participantes
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId);

    console.log('\n--- Participantes ---');
    if (participantsError) {
      console.log('Erro ao buscar participantes:', participantsError.message);
    } else {
      console.log(`Encontrados ${participants?.length || 0} participantes`);
      if (participants && participants.length > 0) {
        console.log('Primeiro participante:', JSON.stringify(participants[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

debugTournamentData();
