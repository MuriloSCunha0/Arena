// Script para testar se os dados do dashboard estão sendo carregados corretamente
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwwgbsihyawjfvbjtnwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dic2loeWF3amZ2Ymp0bnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzgzMjEsImV4cCI6MjA1MTg1NDMyMX0.NJhWpWWOdOTCy1PSZHA-cVYxMH9OiEZaP2lMkYz-uDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardData() {
  console.log('🔍 Testando dados do dashboard...\n');

  try {
    // Teste 1: Verificar eventos
    console.log('📅 Testando dados de eventos:');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');
    
    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
    } else {
      console.log(`✅ Eventos encontrados: ${events?.length || 0}`);
      if (events && events.length > 0) {
        console.log('📋 Primeiro evento:', {
          id: events[0].id,
          title: events[0].title,
          status: events[0].status,
          type: events[0].type
        });
      }
    }

    // Teste 2: Verificar participantes
    console.log('\n👥 Testando dados de participantes:');
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*');
    
    if (participantsError) {
      console.error('❌ Erro ao buscar participantes:', participantsError);
    } else {
      console.log(`✅ Participantes encontrados: ${participants?.length || 0}`);
      if (participants && participants.length > 0) {
        console.log('📋 Primeiro participante:', {
          id: participants[0].id,
          name: participants[0].name,
          event_id: participants[0].event_id
        });
      }
    }

    // Teste 3: Verificar transações financeiras
    console.log('\n💰 Testando dados financeiros:');
    const { data: financials, error: financialsError } = await supabase
      .from('financial_transactions')
      .select('*');
    
    if (financialsError) {
      console.error('❌ Erro ao buscar transações:', financialsError);
    } else {
      console.log(`✅ Transações encontradas: ${financials?.length || 0}`);
      if (financials && financials.length > 0) {
        console.log('📋 Primeira transação:', {
          id: financials[0].id,
          amount: financials[0].amount,
          type: financials[0].type,
          event_id: financials[0].event_id
        });
      }
    }

    // Teste 4: Verificar dados agregados para gráficos
    console.log('\n📊 Testando dados agregados:');
    
    // Receita por evento
    const { data: revenueByEvent, error: revenueError } = await supabase
      .from('financial_transactions')
      .select('event_id, amount, events(title)')
      .eq('type', 'PAYMENT');
    
    if (revenueError) {
      console.error('❌ Erro ao buscar receita por evento:', revenueError);
    } else {
      console.log(`✅ Registros de receita: ${revenueByEvent?.length || 0}`);
    }

    // Participantes por evento
    const { data: participantsByEvent, error: participantsByEventError } = await supabase
      .from('participants')
      .select('event_id, events(title)');
    
    if (participantsByEventError) {
      console.error('❌ Erro ao buscar participantes por evento:', participantsByEventError);
    } else {
      console.log(`✅ Registros de participantes por evento: ${participantsByEvent?.length || 0}`);
    }

    console.log('\n🎯 Teste concluído!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testDashboardData();
