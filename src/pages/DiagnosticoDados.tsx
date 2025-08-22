import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ParticipanteService } from '../services/participanteService';

interface EventData {
  id: string;
  title: string;
  date: string;
  status: string;
  entry_fee: number;
  [key: string]: any;
}

interface TournamentData {
  event_id: string;
  standings_data: any;
  [key: string]: any;
}

interface DadosState {
  eventos: EventData[];
  torneios: TournamentData[];
  eventosService: any[];
  loading: boolean;
  error: string | null;
}

export const DiagnosticoDados = () => {
  const [dados, setDados] = useState<DadosState>({
    eventos: [],
    torneios: [],
    eventosService: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    executarDiagnostico();
  }, []);

  const executarDiagnostico = async () => {
    try {
      setDados(prev => ({ ...prev, loading: true, error: null }));

      // 1. Buscar todos os eventos diretamente
      const { data: eventos, error: eventosError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventosError) throw eventosError;

      // 2. Buscar todos os torneios
      const { data: torneios, error: torneiosError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (torneiosError) throw torneiosError;

      // 3. Testar o ParticipanteService
      let eventosService: any[] = [];
      try {
        eventosService = await ParticipanteService.getEventosDisponiveis();
      } catch (serviceError) {
        console.error('Erro no ParticipanteService:', serviceError);
      }

      setDados({
        eventos: eventos || [],
        torneios: torneios || [],
        eventosService,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      setDados(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  };

  const hoje = new Date().toISOString().split('T')[0];

  const analisarEvento = (evento: EventData) => {
    const torneio = dados.torneios.find(t => t.event_id === evento.id);
    const isFuturo = evento.date > hoje;
    const isStatusValido = ['OPEN', 'PUBLISHED'].includes(evento.status);
    
    let statusTorneio = 'Sem torneio';
    let torneioIniciado = false;
    
    if (torneio) {
      if (torneio.standings_data && Object.keys(torneio.standings_data).length > 0) {
        statusTorneio = 'Torneio iniciado';
        torneioIniciado = true;
      } else {
        statusTorneio = 'Torneio não iniciado';
      }
    }
    
    const deveAparecerNoService = isFuturo && isStatusValido && !torneioIniciado;
    const apareceNoService = dados.eventosService.some(e => e.id === evento.id);
    
    return {
      isFuturo,
      isStatusValido,
      torneioIniciado,
      statusTorneio,
      deveAparecerNoService,
      apareceNoService,
      inconsistencia: deveAparecerNoService !== apareceNoService
    };
  };

  if (dados.loading) {
    return <div className="p-4">🔄 Carregando diagnóstico...</div>;
  }

  if (dados.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-semibold">❌ Erro</h3>
        <p className="text-red-700">{dados.error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🔍 Diagnóstico Completo</h2>
        <button 
          onClick={executarDiagnostico}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded border">
          <h3 className="font-semibold text-blue-800">📊 Resumo</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div>Total de eventos: {dados.eventos.length}</div>
            <div>Total de torneios: {dados.torneios.length}</div>
            <div>Eventos no service: {dados.eventosService.length}</div>
            <div>Data hoje: {hoje}</div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded border">
          <h3 className="font-semibold text-green-800">✅ Critérios</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div>Status: OPEN ou PUBLISHED</div>
            <div>Data: Futura (&gt; {hoje})</div>
            <div>Torneio: Não iniciado</div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded border">
          <h3 className="font-semibold text-orange-800">⚠️ Inconsistências</h3>
          <div className="mt-2 space-y-1 text-sm">
            {dados.eventos.filter(evento => analisarEvento(evento).inconsistencia).length > 0 ? (
              <div className="text-orange-700">
                {dados.eventos.filter(evento => analisarEvento(evento).inconsistencia).length} evento(s) com problemas
              </div>
            ) : (
              <div className="text-green-700">Nenhuma inconsistência encontrada</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📋 Análise Detalhada dos Eventos</h3>
        
        {dados.eventos.map((evento) => {
          const analise = analisarEvento(evento);
          return (
            <div 
              key={evento.id} 
              className={`p-4 border rounded-lg ${
                analise.inconsistencia ? 'bg-red-50 border-red-300' : 
                analise.apareceNoService ? 'bg-green-50 border-green-300' : 
                'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{evento.title}</h4>
                  <div className="mt-1 text-sm text-gray-600">
                    <div>📅 Data: {evento.date} {analise.isFuturo ? '🔮' : '📅'}</div>
                    <div>📋 Status: {evento.status} {analise.isStatusValido ? '✅' : '❌'}</div>
                    <div>🏆 Torneio: {analise.statusTorneio} {analise.torneioIniciado ? '❌' : '✅'}</div>
                    <div>💰 Taxa: R$ {evento.entry_fee || 0}</div>
                    <div>🆔 ID: {evento.id}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    analise.deveAparecerNoService ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {analise.deveAparecerNoService ? '✅ Deve aparecer' : '❌ Não deve aparecer'}
                  </div>
                  <div className={`text-sm ${
                    analise.apareceNoService ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {analise.apareceNoService ? '✅ Aparece no service' : '❌ Não aparece no service'}
                  </div>
                  {analise.inconsistencia && (
                    <div className="text-red-600 text-sm font-medium mt-1">
                      ⚠️ INCONSISTÊNCIA!
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
