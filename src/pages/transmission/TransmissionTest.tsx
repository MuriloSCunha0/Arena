import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const TransmissionTest: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testando conexão com eventId:', eventId);
        
        // Teste 1: Verificar se consegue conectar ao Supabase
        const { data: testData, error: testError } = await supabase
          .from('events')
          .select('id, title, status')
          .limit(5);

        console.log('Teste de conexão:', { testData, testError });

        if (testError) {
          setError(`Erro de conexão: ${testError.message}`);
          return;
        }

        // Teste 2: Buscar evento específico se eventId fornecido
        if (eventId) {
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

          console.log('Evento específico:', { eventData, eventError });

          if (eventError) {
            setError(`Evento não encontrado: ${eventError.message}`);
            setData({ allEvents: testData, specificEvent: null });
            return;
          }

          setData({ allEvents: testData, specificEvent: eventData });
        } else {
          setData({ allEvents: testData, specificEvent: null });
        }

      } catch (err) {
        console.error('Erro no teste:', err);
        setError(`Erro inesperado: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, [eventId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
        <h1>Testando Transmissão...</h1>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>Teste de Transmissão</h1>
      <p><strong>Event ID:</strong> {eventId || 'Não fornecido'}</p>
      
      {error && (
        <div style={{ backgroundColor: '#ff4444', padding: '10px', marginBottom: '20px', borderRadius: '5px' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      <h2>Dados Encontrados:</h2>
      <pre style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>

      <h2>URL Atual:</h2>
      <p>{window.location.href}</p>

      <h2>Parâmetros da URL:</h2>
      <pre style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
        {JSON.stringify(useParams(), null, 2)}
      </pre>
    </div>
  );
};

export default TransmissionTest;
