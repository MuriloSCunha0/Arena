const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hmswtcffthucgppmixwi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtc3d0Y2ZmdGh1Y2dwcG1peHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NTcxNzYsImV4cCI6MjA1MDAzMzE3Nn0.KpWGWw91iU3LI4GmL3GOXH5ZM3NZZZ2CsVWROyIDMUY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTournamentData() {
  try {
    console.log('\n=== Verificando eventos IN_PROGRESS ===');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('status', 'IN_PROGRESS');
    
    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      return;
    }
    
    console.log('Eventos encontrados:', events);
    
    if (events && events.length > 0) {
      for (const event of events) {
        console.log(`\n=== Verificando torneio para evento ${event.title} (${event.id}) ===`);
        
        // Buscar tournament associado
        const { data: tournaments, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('event_id', event.id);
        
        if (tournamentsError) {
          console.error('Erro ao buscar tournaments:', tournamentsError);
          continue;
        }
        
        console.log('Tournaments encontrados:', tournaments);
        
        // Testar o método getTournamentDetails
        console.log('\n=== Testando getTournamentDetails ===');
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
          console.log('Resultado do getTournamentDetails:', JSON.stringify(detailsData, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

debugTournamentData();
