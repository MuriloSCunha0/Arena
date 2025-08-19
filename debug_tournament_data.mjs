import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmswtcffthucgppmixwi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtc3d0Y2ZmdGh1Y2dwcG1peHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NTcxNzYsImV4cCI6MjA1MDAzMzE3Nn0.KpWGWw91iU3LI4GmL3GOXH5ZM3NZZZ2CsVWROyIDMUY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTournamentData() {
  try {
    console.log('\n=== 1. Verificando todos os eventos ===');
    const { data: allEvents, error: allEventsError } = await supabase
      .from('events')
      .select('id, title, status');
    
    if (allEventsError) {
      console.error('Erro ao buscar todos os eventos:', allEventsError);
      return;
    }
    
    console.log('Todos os eventos:', allEvents);
    
    console.log('\n=== 2. Verificando eventos IN_PROGRESS ===');
    const { data: inProgressEvents, error: inProgressError } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('status', 'IN_PROGRESS');
    
    if (inProgressError) {
      console.error('Erro ao buscar eventos IN_PROGRESS:', inProgressError);
      return;
    }
    
    console.log('Eventos IN_PROGRESS:', inProgressEvents);
    
    console.log('\n=== 3. Verificando todos os tournaments ===');
    const { data: allTournaments, error: allTournamentsError } = await supabase
      .from('tournaments')
      .select('id, event_id, status');
    
    if (allTournamentsError) {
      console.error('Erro ao buscar todos os tournaments:', allTournamentsError);
      return;
    }
    
    console.log('Todos os tournaments:', allTournaments);
    
    if (inProgressEvents && inProgressEvents.length > 0) {
      for (const event of inProgressEvents) {
        console.log(`\n=== 4. Testando getTorneiosEmAndamento para ${event.title} ===`);
        
        const { data: ongoingData, error: ongoingError } = await supabase
          .from('events')
          .select(`
            id, 
            title, 
            description, 
            location, 
            date, 
            time, 
            entry_fee, 
            banner_image_url, 
            status,
            tournaments!inner(
              id,
              status,
              standings_data,
              groups_data,
              brackets_data,
              matches_data,
              teams_data,
              current_round,
              total_rounds
            )
          `)
          .in('status', ['IN_PROGRESS'])
          .order('date', { ascending: true });
        
        if (ongoingError) {
          console.error('Erro no getTorneiosEmAndamento:', ongoingError);
        } else {
          console.log('Resultado getTorneiosEmAndamento:', JSON.stringify(ongoingData, null, 2));
        }
        
        console.log(`\n=== 5. Testando getTournamentDetails para ${event.title} ===`);
        
        const { data: detailsData, error: detailsError } = await supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            location,
            date,
            time,
            entry_fee,
            banner_image_url,
            status,
            tournaments!inner(
              id,
              status,
              format,
              settings,
              standings_data,
              groups_data,
              brackets_data,
              matches_data,
              teams_data,
              current_round,
              total_rounds,
              groups_count
            )
          `)
          .eq('id', event.id)
          .single();
        
        if (detailsError) {
          console.error('Erro no getTournamentDetails:', detailsError);
        } else {
          console.log('Resultado getTournamentDetails:', JSON.stringify(detailsData, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

debugTournamentData();
