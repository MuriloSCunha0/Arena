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

async function insertTestEvents() {
  console.log('🔄 Inserindo eventos de teste...');

  const events = [
    {
      title: 'Torneio de Beach Tennis Iniciante',
      description: 'Torneio voltado para iniciantes no beach tennis. Venha participar e se divertir!',
      type: 'TOURNAMENT',
      team_formation: 'FORMED',
      max_participants: 16,
      min_participants: 8,
      location: 'Arena Beach Sports - Fortaleza/CE',
      date: '2025-08-25',
      time: '09:00:00',
      entry_fee: 50.00,
      status: 'OPEN',
      banner_image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop'
    },
    {
      title: 'Copa Beach Tennis Avançado',
      description: 'Competição para jogadores avançados. Prêmios para os primeiros colocados!',
      type: 'TOURNAMENT',
      team_formation: 'FORMED',
      max_participants: 32,
      min_participants: 16,
      location: 'Centro Esportivo Aquiraz',
      date: '2025-09-01',
      time: '08:00:00',
      entry_fee: 80.00,
      status: 'OPEN',
      banner_image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop'
    },
    {
      title: 'Festival Beach Tennis Família',
      description: 'Evento para toda família! Categorias para diferentes idades.',
      type: 'TOURNAMENT',
      team_formation: 'FORMED',
      max_participants: 24,
      min_participants: 12,
      location: 'Praia do Futuro - Fortaleza/CE',
      date: '2025-09-08',
      time: '10:00:00',
      entry_fee: 30.00,
      status: 'PUBLISHED',
      banner_image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop'
    },
    {
      title: 'Torneio Empresarial Beach Tennis',
      description: 'Competição exclusiva para equipes de empresas. Networking e diversão!',
      type: 'TOURNAMENT',
      team_formation: 'FORMED',
      max_participants: 20,
      min_participants: 8,
      location: 'Clube Náutico Atlético Cearense',
      date: '2025-09-15',
      time: '14:00:00',
      entry_fee: 100.00,
      status: 'OPEN',
      banner_image_url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop'
    },
    {
      title: 'Beach Tennis Kids',
      description: 'Torneio especial para crianças de 8 a 14 anos. Venha se divertir!',
      type: 'TOURNAMENT',
      team_formation: 'FORMED',
      max_participants: 16,
      min_participants: 8,
      location: 'Arena Beach Sports - Fortaleza/CE',
      date: '2025-09-22',
      time: '15:00:00',
      entry_fee: 25.00,
      status: 'OPEN',
      banner_image_url: 'https://images.unsplash.com/photo-1551727213-2b7d7da1e0de?w=800&h=600&fit=crop'
    }
  ];

  try {
    const { data, error } = await supabase
      .from('events')
      .insert(events)
      .select();

    if (error) {
      console.error('❌ Erro ao inserir eventos:', error);
      return;
    }

    console.log('✅ Eventos inseridos com sucesso!');
    console.log(`📊 Total de eventos inseridos: ${data?.length || 0}`);
    
    // Verificar se os eventos foram inseridos corretamente
    const { data: allEvents, error: fetchError } = await supabase
      .from('events')
      .select('id, title, status, date, entry_fee')
      .in('status', ['OPEN', 'PUBLISHED'])
      .gt('date', new Date().toISOString().split('T')[0]);

    if (fetchError) {
      console.error('❌ Erro ao verificar eventos:', fetchError);
      return;
    }

    console.log('📋 Eventos disponíveis na base de dados:');
    allEvents?.forEach(event => {
      console.log(`  - ${event.title} (${event.status}) - R$ ${event.entry_fee}`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

insertTestEvents();
