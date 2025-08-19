import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createInProgressTournament() {
  console.log('🔄 Criando torneio em andamento...');

  try {
    // 1. Primeiro criar o evento
    const eventData = {
      title: 'Copa Beach Tennis em Andamento',
      description: 'Torneio de demonstração em andamento. Este é um exemplo de como acompanhar um torneio ao vivo!',
      type: 'TOURNAMENT',
      team_formation: 'FORMED',
      max_participants: 8,
      min_participants: 4,
      current_participants: 8,
      location: 'Arena Demo - Fortaleza/CE',
      date: '2025-08-18', // Hoje
      time: '14:00:00',
      entry_fee: 75.00,
      status: 'IN_PROGRESS',
      banner_image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop'
    };

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (eventError) {
      console.error('❌ Erro ao criar evento:', eventError);
      return;
    }

    console.log('✅ Evento criado:', event.title);

    // 2. Criar dados do torneio
    const tournamentData = {
      event_id: event.id,
      format: 'SINGLE_ELIMINATION',
      status: 'IN_PROGRESS',
      current_round: 1,
      total_rounds: 3,
      groups_count: 2,
      settings: {
        groupSize: 4,
        qualifiersPerGroup: 2
      },
      teams_data: [
        { id: 1, name: 'Dupla Alpha', group: 'A', players: [{ name: 'João Silva' }, { name: 'Pedro Santos' }] },
        { id: 2, name: 'Dupla Beta', group: 'A', players: [{ name: 'Maria Oliveira' }, { name: 'Ana Costa' }] },
        { id: 3, name: 'Dupla Gamma', group: 'A', players: [{ name: 'Carlos Lima' }, { name: 'Paulo Rocha' }] },
        { id: 4, name: 'Dupla Delta', group: 'A', players: [{ name: 'Lucia Mendes' }, { name: 'Sandra Nunes' }] },
        { id: 5, name: 'Dupla Epsilon', group: 'B', players: [{ name: 'Roberto Alves' }, { name: 'José Ferreira' }] },
        { id: 6, name: 'Dupla Zeta', group: 'B', players: [{ name: 'Fernanda Silva' }, { name: 'Patrícia Dias' }] },
        { id: 7, name: 'Dupla Eta', group: 'B', players: [{ name: 'Marcos Paulo' }, { name: 'Ricardo Gomes' }] },
        { id: 8, name: 'Dupla Theta', group: 'B', players: [{ name: 'Helena Castro' }, { name: 'Juliana Reis' }] }
      ],
      groups_data: {
        A: {
          teams: [
            { id: 1, name: 'Dupla Alpha', points: 6, wins: 2, losses: 0 },
            { id: 2, name: 'Dupla Beta', points: 3, wins: 1, losses: 1 },
            { id: 3, name: 'Dupla Gamma', points: 3, wins: 1, losses: 1 },
            { id: 4, name: 'Dupla Delta', points: 0, wins: 0, losses: 2 }
          ]
        },
        B: {
          teams: [
            { id: 5, name: 'Dupla Epsilon', points: 6, wins: 2, losses: 0 },
            { id: 6, name: 'Dupla Zeta', points: 3, wins: 1, losses: 1 },
            { id: 7, name: 'Dupla Eta', points: 3, wins: 1, losses: 1 },
            { id: 8, name: 'Dupla Theta', points: 0, wins: 0, losses: 2 }
          ]
        }
      },
      matches_data: [
        {
          id: 1,
          round: 0,
          round_name: 'Fase de Grupos',
          team1_name: 'Dupla Alpha',
          team2_name: 'Dupla Beta',
          team1_score: 2,
          team2_score: 0,
          status: 'completed',
          scheduled_time: '14:00'
        },
        {
          id: 2,
          round: 0,
          round_name: 'Fase de Grupos',
          team1_name: 'Dupla Gamma',
          team2_name: 'Dupla Delta',
          team1_score: 2,
          team2_score: 1,
          status: 'completed',
          scheduled_time: '14:30'
        },
        {
          id: 3,
          round: 0,
          round_name: 'Fase de Grupos',
          team1_name: 'Dupla Epsilon',
          team2_name: 'Dupla Zeta',
          team1_score: 2,
          team2_score: 0,
          status: 'completed',
          scheduled_time: '15:00'
        },
        {
          id: 4,
          round: 1,
          round_name: 'Semifinal',
          team1_name: 'Dupla Alpha',
          team2_name: 'Dupla Epsilon',
          team1_score: 0,
          team2_score: 0,
          status: 'in_progress',
          scheduled_time: '16:00'
        }
      ],
      standings_data: {
        overall: [
          { id: 1, name: 'Dupla Alpha', group: 'A', points: 6, wins: 2, losses: 0 },
          { id: 5, name: 'Dupla Epsilon', group: 'B', points: 6, wins: 2, losses: 0 },
          { id: 2, name: 'Dupla Beta', group: 'A', points: 3, wins: 1, losses: 1 },
          { id: 6, name: 'Dupla Zeta', group: 'B', points: 3, wins: 1, losses: 1 },
          { id: 3, name: 'Dupla Gamma', group: 'A', points: 3, wins: 1, losses: 1 },
          { id: 7, name: 'Dupla Eta', group: 'B', points: 3, wins: 1, losses: 1 },
          { id: 4, name: 'Dupla Delta', group: 'A', points: 0, wins: 0, losses: 2 },
          { id: 8, name: 'Dupla Theta', group: 'B', points: 0, wins: 0, losses: 2 }
        ]
      }
    };

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert([tournamentData])
      .select()
      .single();

    if (tournamentError) {
      console.error('❌ Erro ao criar torneio:', tournamentError);
      return;
    }

    console.log('✅ Torneio criado com sucesso!');
    console.log(`📊 ID do Evento: ${event.id}`);
    console.log(`🏆 ID do Torneio: ${tournament.id}`);
    console.log(`🔗 URL para acompanhar: /torneio/${event.id}/acompanhar`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createInProgressTournament();
