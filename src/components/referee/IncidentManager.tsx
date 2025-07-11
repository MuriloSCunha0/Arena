import React, { useState, useEffect } from 'react';
import { MatchIncident, IncidentType } from '../../types/referee';
// Fix the import by importing from a correct location or defining the Match interface
// import { Match } from '../../types/tournament'; 
import { User } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AlertCircle, Clock, Flag, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { useNotificationStore } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import IncidentService from '../../services/supabase/incidentService';
import { formatDateTime } from '../../utils/formatters';

// Define the Match interface if it's not exported from tournament
interface Match {
  id: string;
  tournamentId: string;
  team1: string[];
  team2: string[];
  // Add other properties as needed
}

interface IncidentManagerProps {
  match: Match;
  participantMap: Map<string, string>; // Maps IDs to names
  onIncidentAdded?: () => void;
}

export const IncidentManager: React.FC<IncidentManagerProps> = ({
  match,
  participantMap,
  onIncidentAdded
}) => {
  const { user } = useAuth();
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  const [incidents, setIncidents] = useState<MatchIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIncident, setNewIncident] = useState<Partial<MatchIncident>>({
    matchId: match.id,
    tournamentId: match.tournamentId,
    type: IncidentType.WARNING,
    description: '',
    registeredBy: user?.id || '',
  });

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const data = await IncidentService.getByMatchId(match.id);
      setIncidents(data);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao carregar incidentes da partida'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [match.id]);

  const handleAddIncident = async () => {
    try {
      if (!newIncident.description) {
        addNotification({
          type: 'warning',
          message: 'Por favor, adicione uma descrição para o incidente'
        });
        return;
      }

      setLoading(true);
      
      // Add the current timestamp
      const incidentToSave = {
        ...newIncident,
        timestamp: new Date().toISOString()
      };

      await IncidentService.create(incidentToSave);
      
      addNotification({
        type: 'success',
        message: 'Incidente registrado com sucesso'
      });
      
      // Refresh the list
      await fetchIncidents();
      
      // Callback if needed
      if (onIncidentAdded) onIncidentAdded();
      
      // Reset and close modal
      setNewIncident({
        matchId: match.id,
        tournamentId: match.tournamentId,
        type: IncidentType.WARNING,
        description: '',
        registeredBy: user?.id || '',
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding incident:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao registrar incidente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIncident = async (id: string): Promise<void> => {
    if (!confirm('Tem certeza que deseja excluir este incidente?')) return;
    
    try {
      setLoading(true);
      await IncidentService.delete(id);
      
      addNotification({
        type: 'success',
        message: 'Incidente excluído com sucesso'
      });
      
      // Refresh the list
      await fetchIncidents();
    } catch (error) {
      console.error('Error deleting incident:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao excluir incidente'
      });
    } finally {
      setLoading(false);
    }
  };

  const getIncidentTypeLabel = (type: IncidentType): string => {
    const labels: Record<IncidentType, string> = {
      [IncidentType.WARNING]: 'Advertência',
      [IncidentType.POINT_PENALTY]: 'Penalidade de Ponto',
      [IncidentType.GAME_PENALTY]: 'Penalidade de Game',
      [IncidentType.MATCH_PENALTY]: 'Penalidade de Partida',
      [IncidentType.DISQUALIFICATION]: 'Desqualificação',
      [IncidentType.CODE_VIOLATION]: 'Violação de Código',
      [IncidentType.TIME_VIOLATION]: 'Violação de Tempo',
      [IncidentType.OTHER]: 'Outro',
    };
    return labels[type];
  };

  const getIncidentTypeColor = (type: IncidentType): string => {
    const colors: Record<IncidentType, string> = {
      [IncidentType.WARNING]: 'bg-yellow-100 text-yellow-800',
      [IncidentType.POINT_PENALTY]: 'bg-orange-100 text-orange-800',
      [IncidentType.GAME_PENALTY]: 'bg-red-100 text-red-800',
      [IncidentType.MATCH_PENALTY]: 'bg-red-100 text-red-800',
      [IncidentType.DISQUALIFICATION]: 'bg-red-100 text-red-800',
      [IncidentType.CODE_VIOLATION]: 'bg-purple-100 text-purple-800',
      [IncidentType.TIME_VIOLATION]: 'bg-blue-100 text-blue-800',
      [IncidentType.OTHER]: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  // Get team name by ID
  const getTeamName = (teamId: string | undefined): string => {
    if (!teamId) return '';
    
    const teamIds = teamId === 'team1' ? match.team1 : match.team2;
    if (!teamIds || teamIds.length === 0) return teamId;
    
    return teamIds.map(id => participantMap.get(id) || id).join(' & ');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-brand-blue">
          Incidentes e Ocorrências
        </h3>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} className="mr-2" />
          Registrar Incidente
        </Button>
      </div>
      
      {loading && incidents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando incidentes...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
          <h4 className="text-lg font-medium text-gray-700">Nenhum incidente registrado</h4>
          <p className="text-gray-500 mt-1">
            Não há incidentes ou ocorrências registradas para esta partida.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div 
              key={incident.id} 
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getIncidentTypeColor(incident.type)}`}>
                  {getIncidentTypeLabel(incident.type)}
                </div>
                <button 
                  onClick={() => incident.id && handleDeleteIncident(incident.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <p className="text-gray-700 mt-2">
                {incident.description}
              </p>
              
              {incident.teamId && (
                <div className="mt-3 flex items-center text-sm">
                  <UserIcon size={14} className="text-gray-500 mr-1" />
                  <span className="text-gray-600">Contra: {getTeamName(incident.teamId)}</span>
                </div>
              )}
              
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <Clock size={14} className="mr-1" />
                {formatDateTime(incident.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Incident Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Registrar Incidente"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Incidente
            </label>
            <select
              value={newIncident.type}
              onChange={(e) => setNewIncident({
                ...newIncident,
                type: e.target.value as IncidentType
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
            >
              {Object.values(IncidentType).map((type) => (
                <option key={type} value={type}>
                  {getIncidentTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipe Envolvida (opcional)
            </label>
            <select
              value={newIncident.teamId || ''}
              onChange={(e) => setNewIncident({
                ...newIncident,
                teamId: e.target.value || undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
            >
              <option value="">Selecione uma equipe (opcional)</option>
              <option value="team1">{getTeamName('team1')}</option>
              <option value="team2">{getTeamName('team2')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição da Ocorrência
            </label>
            <textarea
              value={newIncident.description}
              onChange={(e) => setNewIncident({
                ...newIncident,
                description: e.target.value
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
              placeholder="Descreva o incidente..."
            />
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddIncident}
              loading={loading}
            >
              <Flag size={16} className="mr-2" />
              Registrar Incidente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
