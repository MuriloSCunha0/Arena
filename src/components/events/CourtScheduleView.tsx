import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../ui/Notification';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Clock, Calendar, Users, Info, Edit, Trash2, Loader2 } from 'lucide-react';
import { Match, Court, CourtReservation } from '../../types';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { useTournamentStore } from '../../store';

interface CourtScheduleViewProps {
  eventId: string;
  court: Court;
  matches: Match[];
  onMatchScheduled?: () => void;
}

export const CourtScheduleView: React.FC<CourtScheduleViewProps> = ({
  eventId,
  court,
  matches,
  onMatchScheduled
}) => {
  const { updateMatchSchedule, loading } = useTournamentStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [courtMatches, setCourtMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  
  // Buscar partidas desta quadra
  useEffect(() => {
    // Filtrar partidas por quadra
    const matchesInCourt = matches.filter(match => match.courtId === court.id);
    setCourtMatches(matchesInCourt);
  }, [court.id, matches]);
  
  const handleScheduleMatch = async (matchId: string) => {
    try {
      if (!scheduledDate || !scheduledTime) {
        addNotification({
          type: 'warning',
          message: 'Por favor, defina a data e hora'
        });
        return;
      }
      
      const isoDateTime = `${scheduledDate}T${scheduledTime}:00`;
      await updateMatchSchedule(matchId, court.id, isoDateTime);
      
      addNotification({
        type: 'success',
        message: 'Partida agendada com sucesso!'
      });
      
      // Atualizar lista de partidas
      if (onMatchScheduled) {
        onMatchScheduled();
      }
      
      setShowAddModal(false);
    } catch (error) {
      console.error('Error scheduling match:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao agendar partida'
      });
    }
  };
  
  // Agenda uma nova partida na quadra
  const openAddMatchModal = (match: Match) => {
    setSelectedMatch(match);
    
    // Definir valores iniciais
    const now = new Date();
    setScheduledDate(now.toISOString().split('T')[0]);
    setScheduledTime('10:00');
    
    setShowAddModal(true);
  };
  
  // Get match name display
  const getMatchDisplay = (match: Match) => {
    let team1 = 'TBD';
    let team2 = 'TBD';
    
    if (match.team1 && match.team1.length > 0) {
      team1 = match.team1[0]; // Idealmente, mapear para o nome
    }
    
    if (match.team2 && match.team2.length > 0) {
      team2 = match.team2[0]; // Idealmente, mapear para o nome
    }
    
    return `${team1} vs ${team2}`;
  };
  
  const sortedMatches = [...courtMatches].sort((a, b) => {
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  });
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-brand-blue">{court.name}</h3>
        <div className="text-sm text-gray-500">{court.location}</div>
      </div>
      
      {courtMatches.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Calendar className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhuma partida agendada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Ainda não há partidas agendadas para esta quadra.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700">Partidas Agendadas</h4>
            <div className="text-xs text-gray-500">{sortedMatches.length} partidas</div>
          </div>
          
          {/* Lista de partidas agendadas na quadra */}
          <div className="space-y-2">
            {sortedMatches.map((match) => (
              <div
                key={match.id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{getMatchDisplay(match)}</div>
                    {match.scheduledTime ? (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Clock size={14} className="mr-1" />
                        {formatDateTime(match.scheduledTime)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">Horário não definido</div>
                    )}
                    
                    <div className="text-xs mt-1">
                      {match.completed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          Concluída
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!match.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddMatchModal(match)}
                    >
                      <Edit size={14} className="mr-1" />
                      Agendar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Modal para agendar partida */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agendar Partida"
      >
        <div className="space-y-4">
          {selectedMatch && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium">Partida:</div>
              <div className="mt-1">{getMatchDisplay(selectedMatch)}</div>
              <div className="mt-2 text-sm font-medium">Quadra:</div>
              <div className="mt-1 flex items-center">
                <div className="h-2 w-2 bg-brand-green rounded-full mr-2"></div>
                {court.name} - {court.location}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedMatch && handleScheduleMatch(selectedMatch.id)}
              loading={loading}
            >
              Confirmar Agendamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
