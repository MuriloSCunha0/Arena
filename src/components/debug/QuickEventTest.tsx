import { useState } from 'react';
import { ParticipanteService } from '../../services/participanteService';

interface TestResult {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
  timestamp: string;
}

export const QuickEventTest = () => {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testEventosDisponiveis = async () => {
    setLoading(true);
    try {
      console.log('🔍 Testando ParticipanteService.getEventosDisponiveis()...');
      
      const eventos = await ParticipanteService.getEventosDisponiveis();
      
      console.log('📊 Resultado:', eventos);
      setResult({
        success: true,
        data: eventos,
        count: eventos.length,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('❌ Erro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setResult({
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-blue-800">🧪 Teste Rápido de Eventos</h3>
        <button
          onClick={testEventosDisponiveis}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testando...' : 'Testar Agora'}
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            <strong>Timestamp:</strong> {result.timestamp}
          </div>
          
          {result.success ? (
            <div className="space-y-2">
              <div className="text-green-700 font-medium">
                ✅ Sucesso: {result.count} eventos encontrados
              </div>
              
              {(result.data?.length || 0) === 0 ? (
                <div className="text-orange-600">
                  ⚠️ Nenhum evento disponível retornado
                </div>
              ) : (
                <div className="space-y-1">
                  {result.data?.map((event: any, index: number) => (
                    <div key={event.id} className="text-sm bg-white p-2 rounded border">
                      <div className="font-medium">{index + 1}. {event.title}</div>
                      <div className="text-gray-600">
                        Data: {event.date} | Taxa: R$ {event.entry_fee || 0} | ID: {event.id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-700">
              ❌ Erro: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
