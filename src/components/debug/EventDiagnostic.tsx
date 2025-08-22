import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type EventData = {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  entry_fee: number;
  banner_image_url: string;
  status: string;
  created_at: string;
};

type TournamentData = {
  event_id: string;
  standings_data: any;
  status: string;
  created_at: string;
};

export const EventDiagnostic = () => {
  const [diagnostic, setDiagnostic] = useState<{
    allEvents: EventData[];
    openEvents: EventData[];
    futureEvents: EventData[];
    availableEvents: EventData[];
    tournaments: TournamentData[];
    loading: boolean;
    error: string | null;
  }>({
    allEvents: [],
    openEvents: [],
    futureEvents: [],
    availableEvents: [],
    tournaments: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const runDiagnostic = async () => {
      try {
        console.log('🔍 Iniciando diagnóstico de eventos...');
        
        // 1. Todos os eventos
        const { data: allEvents, error: allEventsError } = await supabase
          .from('events')
          .select('id, title, description, location, date, time, entry_fee, banner_image_url, status, created_at')
          .order('created_at', { ascending: false });
        
        if (allEventsError) throw allEventsError;
        console.log('📋 Todos os eventos:', allEvents);

        // 2. Eventos OPEN/PUBLISHED
        const { data: openEvents, error: openEventsError } = await supabase
          .from('events')
          .select('id, title, description, location, date, time, entry_fee, banner_image_url, status, created_at')
          .in('status', ['OPEN', 'PUBLISHED']);
        
        if (openEventsError) throw openEventsError;
        console.log('📋 Eventos OPEN/PUBLISHED:', openEvents);

        // 3. Eventos futuros
        const today = new Date().toISOString().split('T')[0];
        const { data: futureEvents, error: futureEventsError } = await supabase
          .from('events')
          .select('id, title, description, location, date, time, entry_fee, banner_image_url, status, created_at')
          .gt('date', today);
        
        if (futureEventsError) throw futureEventsError;
        console.log('📋 Eventos futuros:', futureEvents);

        // 4. Eventos que atendem critérios básicos
        const { data: criteriaEvents, error: criteriaError } = await supabase
          .from('events')
          .select('id, title, description, location, date, time, entry_fee, banner_image_url, status, created_at')
          .in('status', ['OPEN', 'PUBLISHED'])
          .gt('date', today)
          .order('date', { ascending: true });
        
        if (criteriaError) throw criteriaError;
        console.log('📋 Eventos com critérios básicos:', criteriaEvents);

        // 5. Verificar torneios
        let tournaments: TournamentData[] = [];
        if (criteriaEvents && criteriaEvents.length > 0) {
          const eventIds = criteriaEvents.map((event: EventData) => event.id);
          
          const { data: tournamentData } = await supabase
            .from('tournaments')
            .select('event_id, standings_data, status, created_at')
            .in('event_id', eventIds);

          tournaments = tournamentData || [];
          console.log('🏆 Torneios:', tournaments);
        }

        // 6. Filtrar eventos disponíveis
        const availableEvents = criteriaEvents?.filter((event: EventData) => {
          const tournament = tournaments.find((t: TournamentData) => t.event_id === event.id);
          
          if (!tournament) return true;
          
          if (!tournament.standings_data || 
              Object.keys(tournament.standings_data).length === 0) {
            return true;
          }
          
          return false;
        }) || [];

        console.log('✅ Eventos disponíveis finais:', availableEvents);

        setDiagnostic({
          allEvents: allEvents || [],
          openEvents: openEvents || [],
          futureEvents: futureEvents || [],
          availableEvents,
          tournaments,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setDiagnostic(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
      }
    };

    runDiagnostic();
  }, []);

  if (diagnostic.loading) {
    return <div className="p-4">🔍 Executando diagnóstico...</div>;
  }

  if (diagnostic.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-semibold">❌ Erro no Diagnóstico</h3>
        <p className="text-red-700">{diagnostic.error}</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">🔍 Diagnóstico de Eventos</h2>
      
      <div className="text-sm text-gray-600">
        <strong>Data de hoje:</strong> {today}
      </div>

      {/* Todos os eventos */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">
          📋 Todos os Eventos ({diagnostic.allEvents.length})
        </h3>
        {diagnostic.allEvents.map(event => (
          <div key={event.id} className="mb-2 p-2 bg-white rounded border-l-4 border-gray-400">
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600">
              Status: {event.status} | Data: {event.date} | Taxa: R$ {event.entry_fee || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Eventos OPEN/PUBLISHED */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">
          📋 Eventos OPEN/PUBLISHED ({diagnostic.openEvents.length})
        </h3>
        {diagnostic.openEvents.map(event => (
          <div key={event.id} className="mb-2 p-2 bg-white rounded border-l-4 border-blue-400">
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600">
              Status: {event.status} | Data: {event.date}
            </div>
          </div>
        ))}
      </div>

      {/* Eventos futuros */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">
          📅 Eventos Futuros ({diagnostic.futureEvents.length})
        </h3>
        {diagnostic.futureEvents.map(event => (
          <div key={event.id} className="mb-2 p-2 bg-white rounded border-l-4 border-green-400">
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600">
              Status: {event.status} | Data: {event.date}
            </div>
          </div>
        ))}
      </div>

      {/* Torneios */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-semibold text-purple-800 mb-2">
          🏆 Torneios ({diagnostic.tournaments.length})
        </h3>
        {diagnostic.tournaments.map(tournament => (
          <div key={tournament.event_id} className="mb-2 p-2 bg-white rounded border-l-4 border-purple-400">
            <div className="font-medium">Event ID: {tournament.event_id}</div>
            <div className="text-sm text-gray-600">
              Status: {tournament.status} | 
              Standings: {tournament.standings_data ? 'Preenchido' : 'Vazio'}
            </div>
          </div>
        ))}
      </div>

      {/* Eventos disponíveis finais */}
      <div className="bg-emerald-50 p-4 rounded-lg">
        <h3 className="font-semibold text-emerald-800 mb-2">
          ✅ Eventos Disponíveis para Inscrição ({diagnostic.availableEvents.length})
        </h3>
        {diagnostic.availableEvents.length === 0 ? (
          <div className="text-emerald-700">Nenhum evento disponível encontrado.</div>
        ) : (
          diagnostic.availableEvents.map(event => (
            <div key={event.id} className="mb-2 p-2 bg-white rounded border-l-4 border-emerald-400">
              <div className="font-medium">{event.title}</div>
              <div className="text-sm text-gray-600">
                Status: {event.status} | Data: {event.date} | Taxa: R$ {event.entry_fee || 0}
              </div>
              <div className="text-sm text-gray-500">
                Local: {event.location} | Descrição: {event.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
