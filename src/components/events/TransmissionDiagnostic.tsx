import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface DiagnosticData {
  eventId: string;
  event: any;
  groups: any[];
  matches: any[];
  participants: any[];
}

const TransmissionDiagnostic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostic = async () => {
      try {
        console.log('=== DIAGNÓSTICO DE TRANSMISSÃO ===');
        console.log('Event ID da URL:', id);

        // 1. Buscar todos os eventos
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (eventsError) {
          console.error('Erro ao buscar eventos:', eventsError);
        } else {
          console.log('Todos os eventos:', eventsData);
          setAllEvents(eventsData || []);
        }

        if (!id) {
          console.warn('Nenhum ID fornecido na URL');
          setLoading(false);
          return;
        }

        // 2. Buscar evento específico
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) {
          console.error('Erro ao buscar evento específico:', eventError);
        } else {
          console.log('Evento específico encontrado:', eventData);
        }

        // 3. Buscar grupos
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('event_id', id);

        if (groupsError) {
          console.error('Erro ao buscar grupos:', groupsError);
        } else {
          console.log('Grupos encontrados:', groupsData);
        }

        // 4. Buscar matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('event_id', id);

        if (matchesError) {
          console.error('Erro ao buscar matches:', matchesError);
        } else {
          console.log('Matches encontrados:', matchesData);
        }

        // 5. Buscar participantes
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', id);

        if (participantsError) {
          console.error('Erro ao buscar participantes:', participantsError);
        } else {
          console.log('Participantes encontrados:', participantsData);
        }

        setDiagnosticData({
          eventId: id,
          event: eventData,
          groups: groupsData || [],
          matches: matchesData || [],
          participants: participantsData || []
        });

      } catch (error) {
        console.error('Erro no diagnóstico:', error);
      } finally {
        setLoading(false);
      }
    };

    runDiagnostic();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Executando diagnóstico...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h2>🔍 Diagnóstico de Transmissão</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>📍 URL Info</h3>
        <p><strong>Event ID da URL:</strong> {id || 'NENHUM'}</p>
        <p><strong>URL atual:</strong> {window.location.href}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📋 Todos os Eventos Disponíveis</h3>
        {allEvents.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#ddd' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Título</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {allEvents.map(event => (
                <tr key={event.id} style={{ backgroundColor: event.id === id ? '#ffffcc' : 'white' }}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '12px' }}>{event.id}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{event.title}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{event.status}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(event.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>❌ Nenhum evento encontrado</p>
        )}
      </div>

      {diagnosticData && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🎯 Evento Específico (ID: {diagnosticData.eventId})</h3>
          {diagnosticData.event ? (
            <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
              <p><strong>Título:</strong> {diagnosticData.event.title}</p>
              <p><strong>Status:</strong> {diagnosticData.event.status}</p>
              <p><strong>Tipo:</strong> {diagnosticData.event.type}</p>
              <p><strong>Formato:</strong> {diagnosticData.event.format}</p>
            </div>
          ) : (
            <p>❌ Evento não encontrado</p>
          )}
        </div>
      )}

      {diagnosticData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h3>👥 Grupos ({diagnosticData.groups.length})</h3>
            {diagnosticData.groups.length > 0 ? (
              <ul style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                {diagnosticData.groups.map(group => (
                  <li key={group.id}>
                    <strong>{group.name}</strong> (ID: {group.id})
                  </li>
                ))}
              </ul>
            ) : (
              <p>❌ Nenhum grupo encontrado</p>
            )}
          </div>

          <div>
            <h3>🏆 Matches ({diagnosticData.matches.length})</h3>
            {diagnosticData.matches.length > 0 ? (
              <ul style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', maxHeight: '200px', overflow: 'auto' }}>
                {diagnosticData.matches.map(match => (
                  <li key={match.id}>
                    Match {match.round} - {match.completed ? '✅ Finalizado' : '⏳ Pendente'}
                  </li>
                ))}
              </ul>
            ) : (
              <p>❌ Nenhum match encontrado</p>
            )}
          </div>

          <div>
            <h3>👤 Participantes ({diagnosticData.participants.length})</h3>
            {diagnosticData.participants.length > 0 ? (
              <ul style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', maxHeight: '200px', overflow: 'auto' }}>
                {diagnosticData.participants.map(participant => (
                  <li key={participant.id}>
                    {participant.name} (ID: {participant.id})
                  </li>
                ))}
              </ul>
            ) : (
              <p>❌ Nenhum participante encontrado</p>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f4fd', border: '1px solid #bee5eb' }}>
        <h4>💡 Próximos Passos:</h4>
        <ul>
          <li>Verifique se o ID na URL está correto</li>
          <li>Confirme se o evento tem o status adequado</li>
          <li>Verifique se existem grupos e matches para o evento</li>
          <li>Se necessário, use um dos IDs dos eventos listados acima</li>
        </ul>
        
        <h4 style={{ marginTop: '15px' }}>🔗 Links de Teste Rápido:</h4>
        {allEvents.slice(0, 5).map(event => (
          <div key={event.id} style={{ margin: '5px 0' }}>
            <a 
              href={`/transmission/${event.id}`} 
              style={{ 
                display: 'inline-block', 
                padding: '5px 10px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '3px',
                fontSize: '12px'
              }}
            >
              📺 {event.title}
            </a>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
              Status: {event.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransmissionDiagnostic;
