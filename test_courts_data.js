import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://rdkwamwhiynmjktzjhdn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka3dhbXdoaXlubWprdHpqaGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwOTI1MTcsImV4cCI6MjA0NjY2ODUxN30.49f1kTRo_3LPfhePQGcb4T8OQ-0sR8W6Aa4hJUl_XNo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCourtsData() {
  console.log('🏟️ === TESTE DOS DADOS DAS QUADRAS ===');
  
  try {
    // 1. Verificar se existem quadras
    console.log('\n📊 1. Verificando quadras existentes...');
    const { data: courts, error: courtsError } = await supabase
      .from('courts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (courtsError) {
      console.error('❌ Erro ao buscar quadras:', courtsError);
      return;
    }
    
    console.log(`✅ Total de quadras encontradas: ${courts.length}`);
    
    if (courts.length > 0) {
      console.log('\n📋 Quadras existentes:');
      courts.forEach((court, index) => {
        console.log(`  ${index + 1}. ${court.name}`);
        console.log(`     📍 Local: ${court.location}`);
        console.log(`     🏗️ Tipo: ${court.type}`);
        console.log(`     📊 Status: ${court.status}`);
        console.log(`     🏠 Indoor: ${court.indoor ? 'Sim' : 'Não'}`);
        console.log(`     ✅ Ativa: ${court.active ? 'Sim' : 'Não'}`);
        if (court.surface) console.log(`     🎾 Superfície: ${court.surface}`);
        if (court.description) console.log(`     📝 Descrição: ${court.description}`);
        console.log('');
      });
    } else {
      console.log('\n🆕 Nenhuma quadra encontrada. Criando quadras de exemplo...');
      
      const sampleCourts = [
        {
          name: 'Quadra Central',
          location: 'Arena Principal',
          type: 'PADEL',
          status: 'AVAILABLE',
          surface: 'Grama Sintética',
          indoor: false,
          active: true,
          description: 'Quadra principal com excelente iluminação e estrutura profissional.'
        },
        {
          name: 'Quadra Indoor 1',
          location: 'Complexo Coberto',
          type: 'PADEL',
          status: 'AVAILABLE',
          surface: 'Sintético',
          indoor: true,
          active: true,
          description: 'Quadra coberta com ar condicionado e piso sintético.'
        },
        {
          name: 'Quadra Beach Tennis',
          location: 'Arena de Areia',
          type: 'BEACH_TENNIS',
          status: 'AVAILABLE',
          surface: 'Areia',
          indoor: false,
          active: true,
          description: 'Quadra especializada em Beach Tennis com areia fina.'
        },
        {
          name: 'Quadra 2',
          location: 'Arena Norte',
          type: 'PADEL',
          status: 'AVAILABLE',
          surface: 'Saibro',
          indoor: false,
          active: true,
          description: 'Quadra secundária com piso de saibro.'
        },
        {
          name: 'Quadra VIP',
          location: 'Setor Premium',
          type: 'PADEL',
          status: 'AVAILABLE',
          surface: 'Hard Court',
          indoor: true,
          active: true,
          description: 'Quadra premium com acabamento especial e vestiários exclusivos.'
        }
      ];
      
      for (const court of sampleCourts) {
        const { data, error } = await supabase
          .from('courts')
          .insert([court])
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Erro ao criar quadra ${court.name}:`, error);
        } else {
          console.log(`✅ Quadra "${court.name}" criada com sucesso!`);
        }
      }
    }
    
    // 2. Verificar relação entre eventos e quadras
    console.log('\n🔗 2. Verificando relação entre eventos e quadras...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, court_ids')
      .not('court_ids', 'is', null);
    
    if (eventsError) {
      console.error('❌ Erro ao buscar eventos com quadras:', eventsError);
    } else {
      console.log(`✅ Eventos com quadras associadas: ${events.length}`);
      
      if (events.length > 0) {
        console.log('\n📋 Eventos com quadras:');
        events.forEach((event, index) => {
          console.log(`  ${index + 1}. ${event.title}`);
          console.log(`     🏟️ Quadras: ${event.court_ids ? event.court_ids.length : 0} associadas`);
        });
      }
    }
    
    // 3. Verificar reservas das quadras
    console.log('\n📅 3. Verificando reservas das quadras...');
    const { data: reservations, error: reservationsError } = await supabase
      .from('court_reservations')
      .select(`
        *,
        courts (name, location)
      `)
      .order('start_time', { ascending: false })
      .limit(10);
    
    if (reservationsError) {
      console.error('❌ Erro ao buscar reservas:', reservationsError);
    } else {
      console.log(`✅ Reservas encontradas: ${reservations.length}`);
      
      if (reservations.length > 0) {
        console.log('\n📋 Últimas reservas:');
        reservations.forEach((reservation, index) => {
          console.log(`  ${index + 1}. ${reservation.title}`);
          console.log(`     🏟️ Quadra: ${reservation.courts?.name || 'N/A'}`);
          console.log(`     📅 Início: ${new Date(reservation.start_time).toLocaleString('pt-BR')}`);
          console.log(`     📊 Status: ${reservation.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testCourtsData();
