import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const PaymentStatusTest: React.FC = () => {
  const [testId, setTestId] = useState('f97c81c5-eaeb-4fef-820f-88f720c3f891');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testDirectQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Primeiro, vamos verificar se o participante existe
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', testId)
        .single();

      if (participantError) {
        throw new Error(`Erro ao buscar participante: ${participantError.message}`);
      }

      console.log('Participante encontrado:', participantData);

      // Agora vamos tentar atualizar o status
      const { data: updateData, error: updateError } = await supabase
        .from('participants')
        .update({ 
          payment_status: 'CONFIRMED',
          payment_date: new Date().toISOString()
        })
        .eq('id', testId)
        .select('*')
        .single();

      if (updateError) {
        throw new Error(`Erro ao atualizar: ${updateError.message}`);
      }

      setResult({
        original: participantData,
        updated: updateData,
        success: true
      });

    } catch (err: any) {
      console.error('Erro no teste:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const testAuthStatus = async () => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      setResult({
        user: user,
        authenticated: !!user,
        userId: user?.id,
        role: user?.user_metadata?.role || 'No role'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTableStructure = async () => {
    setLoading(true);
    try {
      // Primeiro, vamos tentar fazer um select para ver quais colunas existem
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .limit(1);

      if (error) {
        throw new Error(`Erro ao consultar tabela: ${error.message}`);
      }

      // Se conseguimos fazer select, vamos ver a estrutura
      const structure = data && data.length > 0 ? Object.keys(data[0]) : [];

      setResult({
        tableExists: true,
        columns: structure,
        sampleData: data?.[0] || null,
        hasPaymentStatus: structure.includes('payment_status')
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testRLSPolicies = async () => {
    setLoading(true);
    try {
      // Testar diferentes queries para ver quais funcionam
      const tests = [];

      // Teste 1: Select básico
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('id, payment_status')
          .eq('id', testId);
        tests.push({ name: 'Select básico', success: !error, data, error });
      } catch (err) {
        tests.push({ name: 'Select básico', success: false, error: err });
      }

      // Teste 2: Update básico
      try {
        const { data, error } = await supabase
          .from('participants')
          .update({ payment_status: 'PENDING' })
          .eq('id', testId)
          .select();
        tests.push({ name: 'Update básico', success: !error, data, error });
      } catch (err) {
        tests.push({ name: 'Update básico', success: false, error: err });
      }

      setResult({ tests });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testRpcFunction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Testar a função RPC que criamos para contornar o cache
      const { data, error } = await supabase
        .rpc('update_participant_payment_status', {
          participant_id: testId,
          new_status: 'CONFIRMED'
        });

      if (error) {
        throw new Error(`Erro na função RPC: ${error.message}`);
      }

      setResult({
        method: 'RPC Function',
        success: true,
        data: data,
        message: 'Função RPC executada com sucesso'
      });

    } catch (err: any) {
      console.error('Erro no teste RPC:', err);
      setError(err.message || 'Erro desconhecido na função RPC');
    } finally {
      setLoading(false);
    }
  };

  const testCacheRefresh = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Tentar forçar refresh do cache via função SQL
      const { data, error } = await supabase
        .rpc('pg_notify', {
          channel: 'pgrst',
          payload: 'reload schema'
        });

      setResult({
        method: 'Cache Refresh',
        success: !error,
        message: error ? `Erro: ${error.message}` : 'Cache refresh enviado com sucesso'
      });

    } catch (err: any) {
      console.error('Erro no cache refresh:', err);
      setError(err.message || 'Erro ao tentar refresh do cache');
    } finally {
      setLoading(false);
    }
  };

  const testCacheUtils = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Importar dinamicamente as utilidades de cache
      const { validateCriticalColumns, forceCacheRefresh } = await import('../../utils/cacheUtils');
      
      // Validar colunas críticas
      const validation = await validateCriticalColumns();
      
      // Forçar refresh do cache
      const refreshResult = await forceCacheRefresh();
      
      setResult({
        method: 'Cache Utilities Test',
        validation: validation,
        cacheRefresh: refreshResult,
        summary: {
          eventsValid: validation.eventsValid,
          participantsValid: validation.participantsValid,
          missingColumns: validation.missingColumns,
          cacheRefreshed: refreshResult
        }
      });

    } catch (err: any) {
      console.error('Erro no teste de cache utils:', err);
      setError(err.message || 'Erro ao testar utilidades de cache');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teste de Atualização de Status de Pagamento</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          ID do Participante:
        </label>
        <input
          type="text"
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          placeholder="ID do participante para teste"
        />
      </div>

      <div className="space-y-4 mb-6">
        <button
          onClick={testAuthStatus}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testando...' : 'Testar Autenticação'}
        </button>

        <button
          onClick={testDirectQuery}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testando...' : 'Testar Query Direta'}
        </button>

        <button
          onClick={testRLSPolicies}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testando...' : 'Testar Políticas RLS'}
        </button>

        <button
          onClick={testTableStructure}
          disabled={loading}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testando...' : 'Verificar Estrutura da Tabela'}
        </button>

        <button
          onClick={testRpcFunction}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testando...' : 'Testar Função RPC'}
        </button>

        <button
          onClick={testCacheRefresh}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testando...' : 'Forçar Cache Refresh'}
        </button>

        <button
          onClick={testCacheUtils}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testando...' : 'Testar Cache Utils'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusTest;
