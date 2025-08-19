import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmswtcffthucgppmixwi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtc3d0Y2ZmdGh1Y2dwcG1peHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NTcxNzYsImV4cCI6MjA1MDAzMzE3Nn0.KpWGWw91iU3LI4GmL3GOXH5ZM3NZZZ2CsVWROyIDMUY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEventAndParticipants() {
  try {
    console.log('\n=== Criando evento de teste ===');
    
    // Primeiro, buscar um organizador existente
    const { data: organizers, error: organizersError } = await supabase
      .from('organizers')
      .select('id')
      .limit(1);
    
    if (organizersError) {
      console.error('Erro ao buscar organizadores:', organizersError);
      return;
    }

    if (!organizers || organizers.length === 0) {
      console.log('Nenhum organizador encontrado. Criando um organizador...');
      
      const { data: newOrganizer, error: newOrganizerError } = await supabase
        .from('organizers')
        .insert({
          name: 'Arena Norte',
          email: 'arena@exemplo.com',
          phone: '(85) 99999-9999',
          active: true
        })
        .select()
        .single();
      
      if (newOrganizerError) {
        console.error('Erro ao criar organizador:', newOrganizerError);
        return;
      }
      
      organizers.push(newOrganizer);
    }

    const organizerId = organizers[0].id;
    console.log('Usando organizador ID:', organizerId);

    // Criar um evento IN_PROGRESS
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({
        title: 'Arena Norte Open',
        description: 'Torneio de Beach Tennis em andamento',
        type: 'TOURNAMENT',
        tournament_format: 'GROUP_STAGE_ELIMINATION',
        team_formation: 'FORMED',
        max_participants: 16,
        min_participants: 8,
        current_participants: 12,
        location: 'Arena Norte',
        date: '2024-09-24',
        time: '08:00:00',
        entry_fee: 105.00,
        organizer_id: organizerId,
        status: 'IN_PROGRESS',
        banner_image_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400'
      })
      .select()
      .single();

    if (eventError) {
      console.error('Erro ao criar evento:', eventError);
      return;
    }

    console.log('Evento criado:', eventData);

    // Criar alguns participantes
    const participants = [
      { name: 'João Silva', partner_name: 'Maria Santos', team_name: 'Dupla 1', category: 'Masculino', skill_level: 'Avançado' },
      { name: 'Pedro Oliveira', partner_name: 'Ana Costa', team_name: 'Dupla 2', category: 'Misto', skill_level: 'Intermediário' },
      { name: 'Carlos Lima', partner_name: 'Paula Rodrigues', team_name: 'Dupla 3', category: 'Misto', skill_level: 'Avançado' },
      { name: 'Rafael Sousa', partner_name: 'Luciana Ferreira', team_name: 'Dupla 4', category: 'Misto', skill_level: 'Intermediário' },
      { name: 'Diego Martins', partner_name: 'Camila Alves', team_name: 'Dupla 5', category: 'Misto', skill_level: 'Avançado' },
      { name: 'Thiago Barbosa', partner_name: 'Fernanda Silva', team_name: 'Dupla 6', category: 'Misto', skill_level: 'Intermediário' }
    ];

    for (const [index, participant] of participants.entries()) {
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .insert({
          event_id: eventData.id,
          name: participant.name,
          email: `${participant.name.toLowerCase().replace(' ', '.')}@exemplo.com`,
          phone: `(85) 9999${1000 + index}`,
          cpf: `000.000.00${index}-0${index}`,
          partner_name: participant.partner_name,
          team_name: participant.team_name,
          category: participant.category,
          skill_level: participant.skill_level,
          seed_number: index + 1,
          payment_status: 'CONFIRMED',
          payment_method: 'PIX'
        })
        .select()
        .single();

      if (participantError) {
        console.error(`Erro ao criar participante ${participant.name}:`, participantError);
      } else {
        console.log(`Participante criado: ${participant.name}`);
      }
    }

    // Opcionalmente, criar um tournament associado
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        event_id: eventData.id,
        format: 'GROUP_STAGE_ELIMINATION',
        status: 'IN_PROGRESS',
        current_round: 1,
        total_rounds: 3,
        groups_count: 2,
        settings: { groupSize: 4, qualifiersPerGroup: 2 },
        groups_data: {
          'A': ['Dupla 1', 'Dupla 2', 'Dupla 3'],
          'B': ['Dupla 4', 'Dupla 5', 'Dupla 6']
        }
      })
      .select()
      .single();

    if (tournamentError) {
      console.error('Erro ao criar tournament:', tournamentError);
    } else {
      console.log('Tournament criado:', tournamentData);
    }

    console.log('\n=== Evento de teste criado com sucesso! ===');
    console.log(`Event ID: ${eventData.id}`);

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createTestEventAndParticipants();
