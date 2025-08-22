import { useState } from 'react';
import { ParticipanteService } from '../../services/participanteService';

interface DebugData {
  success: boolean;
  result?: any;
  type?: string;
  isArray?: boolean;
  length?: number;
  firstEvent?: any;
  error?: string;
  timestamp: string;
}

export const DebugEventsData = () => {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);

  const testService = async () => {
    setLoading(true);
    try {
      console.log('🔍 Chamando ParticipanteService.getEventosDisponiveis()...');
      const result = await ParticipanteService.getEventosDisponiveis();
      console.log('📊 Resultado completo:', result);
      console.log('📊 Tipo do resultado:', typeof result);
      console.log('📊 É array?', Array.isArray(result));
      console.log('📊 Length:', result?.length);
      
      if (result && result.length > 0) {
        console.log('📊 Primeiro evento:', result[0]);
        console.log('📊 Propriedades do primeiro evento:', Object.keys(result[0]));
      }
      
      setData({
        success: true,
        result,
        type: typeof result,
        isArray: Array.isArray(result),
        length: result?.length || 0,
        firstEvent: result?.[0] || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Erro:', error);
      setData({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-yellow-800">🧪 Debug Service Data</h3>
        <button
          onClick={testService}
          disabled={loading}
          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? 'Testando...' : 'Testar Service'}
        </button>
      </div>

      {data && (
        <div className="space-y-3">
          <div className="text-sm">
            <strong>Timestamp:</strong> {data.timestamp}
          </div>
          
          {data.success ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>✅ <strong>Sucesso:</strong> {data.success ? 'Sim' : 'Não'}</div>
                <div>📊 <strong>Tipo:</strong> {data.type}</div>
                <div>📋 <strong>É Array:</strong> {data.isArray ? 'Sim' : 'Não'}</div>
                <div>📏 <strong>Length:</strong> {data.length}</div>
              </div>
              
              {data.firstEvent && (
                <div className="bg-white p-3 rounded border">
                  <div className="font-medium text-sm mb-2">🎯 Primeiro Evento:</div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(data.firstEvent, null, 2)}
                  </pre>
                </div>
              )}
              
              {data.length === 0 && (
                <div className="text-orange-600 font-medium">
                  ⚠️ Service retornou array vazio!
                </div>
              )}
              
              <div className="bg-white p-3 rounded border">
                <div className="font-medium text-sm mb-2">📋 Dados Completos:</div>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {JSON.stringify(data.result, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-red-700">
              ❌ <strong>Erro:</strong> {data.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
