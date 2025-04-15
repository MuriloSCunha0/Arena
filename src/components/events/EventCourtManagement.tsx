import React, { useEffect, useState } from 'react';
import { Court, Match } from '../../types';
import { useCourtsStore, useEventsStore, useTournamentStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Calendar, Clock, MapPin, RotateCw, ThumbsUp, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatDate, formatTime } from '../../utils/formatters';

interface EventCourtManagementProps {
  eventId: string;
  value?: string;
}

export const EventCourtManagement: React.FC<EventCourtManagementProps> = ({ 
  eventId 
}) => {
  const { currentEvent, fetchEventById } = useEventsStore();
  const { courts, loading: loadingCourts, fetchCourts } = useCourtsStore();
  const { tournament, fetchTournament, updateMatchSchedule } = useTournamentStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  
  // Load necessary data
  useEffect(() => {
    if (eventId) {
      setLoading(true);
      Promise.all([
        fetchEventById(eventId),
        fetchCourts(),
        fetchTournament(eventId)
      ])
      .catch(error => {
        console.error("Error loading court management data:", error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar dados das quadras'
        });
      })
      .finally(() => {
        setLoading(false);
      });
    }
  }, [eventId, fetchEventById, fetchCourts, fetchTournament, addNotification]);
  
  // Get event courts
  const eventCourts = currentEvent?.courtIds 
    ? courts.filter(c => currentEvent.courtIds?.includes(c.id))
    : [];
  
  // Get matches by court for the selected date
  const getMatchesByCourtForDate = (courtId: string) => {
    if (!tournament) return [];
    
    return tournament.matches.filter(match => 
      match.courtId === courtId && 
      match.scheduledTime && 
      match.scheduledTime.startsWith(selectedDate)
    );
  };
  
  // Get unscheduled matches
  const getUnscheduledMatches = () => {
    if (!tournament) return [];
    
    return tournament.matches.filter(match => 
      !match.courtId || !match.scheduledTime
    );
  };
  
  // Handle schedule match
  const handleScheduleMatch = (match: Match, court: Court) => {
    setSelectedMatch(match);
    setSelectedCourt(court);
    setSelectedTime(new Date().toTimeString().substring(0, 5));
    setShowScheduleModal(true);
  };
  
  // Handle save schedule
  const handleSaveSchedule = async () => {
    if (!selectedMatch || !selectedCourt || !selectedTime) return;
    
    try {
      const scheduledTime = `${selectedDate}T${selectedTime}:00`;
      await updateMatchSchedule(selectedMatch.id, selectedCourt.id, scheduledTime);
      
      addNotification({
        type: 'success',
        message: 'Partida agendada com sucesso!'
      });
      
      setShowScheduleModal(false);
    } catch (error) {
      console.error("Error scheduling match:", error);
      addNotification({
        type: 'error',
        message: 'Erro ao agendar partida'
      });
    }
  };
  
  // Apply automatic scheduling algorithm
  const handleAutoSchedule = async () => {
    if (!tournament || !eventCourts.length) return;
    
    try {
      setLoading(true);
      
      // Get unscheduled matches
      const unscheduledMatches = getUnscheduledMatches();
      
      if (unscheduledMatches.length === 0) {
        addNotification({
          type: 'warning',
          message: 'Não há partidas para agendar'
        });
        return;
      }
      
      // Simple algorithm: distribute matches across courts with 30 min intervals
      let baseTime = new Date();
      baseTime.setHours(9, 0, 0, 0); // Start at 9 AM
      
      const matchesByCourt: Record<string, Match[]> = {};
      
      // Initialize courts
      eventCourts.forEach(court => {
        matchesByCourt[court.id] = [];
      });
      
      // Distribute matches based on round
      const matchesByRound = unscheduledMatches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
      }, {} as Record<number, Match[]>);
      
      // Process rounds in order
      const rounds = Object.keys(matchesByRound).map(Number).sort();
      
      for (const round of rounds) {
        const roundMatches = matchesByRound[round];
        
        for (let i = 0; i < roundMatches.length; i++) {
          const match = roundMatches[i];
          const courtId = eventCourts[i % eventCourts.length].id;
          
          // Add to matches by court
          matchesByCourt[courtId].push(match);
        }
      }
      
      // Now schedule all matches with times
      for (const courtId in matchesByCourt) {
        let courtBaseTime = new Date(baseTime);
        
        for (const match of matchesByCourt[courtId]) {
          // Format the date and time
          const matchDate = courtBaseTime.toISOString().split('T')[0];
          const matchTime = courtBaseTime.toTimeString().substring(0, 5);
          const scheduledTime = `${matchDate}T${matchTime}:00`;
          
          // Update match schedule
          await updateMatchSchedule(match.id, courtId, scheduledTime);
          
          // Add 30 minutes for next match
          courtBaseTime = new Date(courtBaseTime.getTime() + 30 * 60000);
        }
      }
      
      addNotification({
        type: 'success',
        message: 'Agendamento automático concluído!'
      });
      
      // Refresh data
      await fetchTournament(eventId);
      
    } catch (error) {
      console.error("Error in auto scheduling:", error);
      addNotification({
        type: 'error',
        message: 'Erro ao realizar agendamento automático'
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RotateCw className="animate-spin h-10 w-10 text-brand-green" />
      </div>
    );
  }
  
  if (!currentEvent) {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 text-orange-700">
        Evento não encontrado.
      </div>
    );
  }
  
  if (eventCourts.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-yellow-700">
          Este evento não tem quadras associadas. Edite o evento para adicionar quadras.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-blue">Gerenciamento de Quadras</h3>
          <p className="text-sm text-gray-500">Organize os jogos nas quadras disponíveis deste evento</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-white border border-brand-gray rounded-md">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          
          <Button 
            variant="outline"
            onClick={handleAutoSchedule}
            disabled={!tournament || loading}
          >
            <RotateCw size={16} className="mr-2" />
            Agendamento Automático
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventCourts.map(court => {
          const courtMatches = getMatchesByCourtForDate(court.id);
          
          return (
            <div 
              key={court.id} 
              className="bg-white rounded-lg border border-brand-gray overflow-hidden"
            >
              <div 
                className="bg-gray-50 p-4 border-b border-brand-gray flex justify-between items-center"
              >
                <h4 className="font-medium text-brand-blue flex items-center">
                  <MapPin size={16} className="mr-2" />
                  {court.name}
                </h4>
                <span className="text-xs text-gray-500">
                  {court.surface || 'Superfície não especificada'}
                </span>
              </div>
              
              <div className="p-4">
                {courtMatches.length > 0 ? (
                  <div className="space-y-3">
                    {courtMatches.map(match => {
                      const time = match.scheduledTime 
                        ? new Date(match.scheduledTime).toTimeString().substring(0, 5) 
                        : '';
                        
                      return (
                        <div 
                          key={match.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded">
                              Rodada {match.round}
                            </span>
                            {time && (
                              <span className="text-xs font-medium flex items-center">
                                <Clock size={12} className="mr-1" />
                                {time}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <p className="font-medium">
                              {match.team1 && match.team1.length > 0 
                                ? `Time ${match.team1[0].substring(0, 6)}...` 
                                : 'TBD'}
                            </p>
                            <p className="text-xs text-gray-500 my-1">vs</p>
                            <p className="font-medium">
                              {match.team2 && match.team2.length > 0 
                                ? `Time ${match.team2[0].substring(0, 6)}...` 
                                : 'TBD'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                      Nenhuma partida agendada para esta data
                    </p>
                    {tournament && getUnscheduledMatches().length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleScheduleMatch(getUnscheduledMatches()[0], court)}
                      >
                        Agendar Partida
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Unscheduled Matches Section */}
      {tournament && getUnscheduledMatches().length > 0 && (
        <div className="bg-white rounded-lg border border-brand-gray overflow-hidden mt-6">
          <div className="bg-gray-50 p-4 border-b border-brand-gray">
            <h4 className="font-medium text-brand-orange flex items-center">
              <Calendar size={16} className="mr-2" />
              Partidas Não Agendadas ({getUnscheduledMatches().length})
            </h4>
          </div>
          
          <div className="p-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {getUnscheduledMatches().map(match => (
                <div 
                  key={match.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center mb-1">
                      <span className="text-xs font-medium bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded">
                        Rodada {match.round}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">
                        {match.team1 && match.team1.length > 0 
                          ? `Time ${match.team1[0].substring(0, 6)}...` 
                          : 'TBD'}
                      </span>
                      <span className="mx-1 text-gray-400">vs</span>
                      <span className="font-medium">
                        {match.team2 && match.team2.length > 0 
                          ? `Time ${match.team2[0].substring(0, 6)}...` 
                          : 'TBD'}
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {eventCourts.map(court => (
                      <Button
                        key={court.id}
                        variant="outline"
                        size="sm"
                        className="p-1.5"
                        onClick={() => handleScheduleMatch(match, court)}
                      >
                        <MapPin size={14} className="mr-1" />
                        {court.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Scheduling Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Agendar Partida"
      >
        <div className="space-y-4">
          {selectedMatch && selectedCourt && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-brand-blue">
                  Agendando partida da Rodada {selectedMatch.round}
                </p>
                
                <div className="mt-2 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Quadra</p>
                    <p className="font-medium">{selectedCourt.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data</p>
                    <p className="font-medium">{formatDate(selectedDate)}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                >
                  <X size={16} className="mr-1" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveSchedule}
                >
                  <ThumbsUp size={16} className="mr-1" />
                  Confirmar
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
