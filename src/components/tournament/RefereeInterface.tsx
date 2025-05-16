import React, { useState, useEffect } from 'react';
import { Match, Tournament, Court } from '../../types';
import { BeachTennisScore, MatchFormat } from '../../types/tournament'; 
import { Button } from '../ui/Button';
import { Calendar, Clock, MapPin, AlertTriangle, CheckCircle, User, Award } from 'lucide-react';
import ModalRegistroGames from './ModalRegistroGames';

interface RefereeInterfaceProps {
  tournament: Tournament;
  matches: Match[];
  courts?: Court[];
  participants: Map<string, { name: string, rating?: number }>;
  onUpdateMatch: (matchId: string, beachTennisScore: BeachTennisScore, walkover?: boolean) => Promise<void>;
}

export const RefereeInterface: React.FC<RefereeInterfaceProps> = ({
  tournament,
  matches,
  courts = [],
  participants,
  onUpdateMatch
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'upcoming' | 'completed'>('current');
  
  // Participant name mapping for easier access
  const participantMap = new Map<string, string>();
  participants.forEach((data, id) => {
    participantMap.set(id, data.name);
  });
  
  // Group matches by status
  useEffect(() => {
    const now = new Date();
    
    // Filter matches
    const current: Match[] = [];
    const upcoming: Match[] = [];
    const completed: Match[] = [];
    
    matches.forEach(match => {
      if (match.completed) {
        completed.push(match);
      } else if (match.scheduledTime) {
        const matchTime = new Date(match.scheduledTime);
        const timeDiff = (matchTime.getTime() - now.getTime()) / (1000 * 60); // minutes
        
        if (timeDiff < 30 && timeDiff > -60) {
          // Within 30 min before or 60 min after scheduled time
          current.push(match);
        } else if (timeDiff >= 30) {
          upcoming.push(match);
        }
      } else {
        // Unscheduled matches go to upcoming
        upcoming.push(match);
      }
    });
    
    // Sort current matches by closest to scheduled time
    current.sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });
    
    // Sort upcoming matches by scheduled time
    upcoming.sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });
    
    // Sort completed matches by most recent first
    completed.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
    
    setCurrentMatches(current);
    setUpcomingMatches(upcoming);
    setCompletedMatches(completed);
  }, [matches]);
  
  // Get match format based on match details
  const getMatchFormat = (match: Match): MatchFormat => {
    if (match.stage === 'GROUP') {
      return MatchFormat.GROUP_STAGE;
    }
    
    // Check if it's a final
    const isLastRound = !matches.some(m => 
      m.stage === 'ELIMINATION' && m.round > match.round
    );
    
    return isLastRound ? MatchFormat.ELIMINATION_FINAL : MatchFormat.ELIMINATION_EARLY;
  };
  
  // Format team name
  const formatTeamName = (teamIds: string[] | null): string => {
    if (!teamIds || teamIds.length === 0) return 'TBD';
    return teamIds.map(id => participantMap.get(id) || id).join(' & ');
  };
  
  // Format match time
  const formatMatchTime = (dateStr: string | null): string => {
    if (!dateStr) return 'Não agendado';
    
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format match date
  const formatMatchDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  // Get court name
  const getCourtName = (courtId: string | null): string => {
    if (!courtId) return 'Não definido';
    const court = courts.find(c => c.id === courtId);
    return court ? court.name : 'Quadra não encontrada';
  };
  
  // Handle opening the score modal
  const openScoreModal = (match: Match) => {
    setSelectedMatch(match);
    setIsScoreModalOpen(true);
  };
  
  // Handle saving match score
  const handleSaveScore = async (
    matchId: string, 
    beachTennisScore: BeachTennisScore, 
    walkover?: boolean
  ) => {
    await onUpdateMatch(matchId, beachTennisScore, walkover);
    setIsScoreModalOpen(false);
  };
  
  // Render match card
  const renderMatchCard = (match: Match, showActions: boolean = true) => {
    return (
      <div 
        key={match.id}
        className={`border rounded-lg p-4 ${
          match.completed ? 'bg-gray-50' : 
          match.walkover ? 'bg-orange-50' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-medium text-gray-500">
              {match.stage === 'GROUP' ? `Grupo ${match.groupNumber}` : 
                `Eliminatórias - Rodada ${match.round}`}
            </span>
            {match.scheduledTime && (
              <div className="flex items-center text-sm mt-1 text-gray-600">
                <Calendar size={14} className="mr-1" />
                <span>{formatMatchDate(match.scheduledTime)}</span>
                <Clock size={14} className="ml-2 mr-1" />
                <span>{formatMatchTime(match.scheduledTime)}</span>
              </div>
            )}
            {match.courtId && (
              <div className="flex items-center text-sm mt-1 text-gray-600">
                <MapPin size={14} className="mr-1" />
                <span>{getCourtName(match.courtId)}</span>
              </div>
            )}
          </div>
          
          {match.walkover && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
              <AlertTriangle size={12} className="mr-1" /> W.O.
            </span>
          )}
          
          {match.completed && !match.walkover && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle size={12} className="mr-1" /> Concluída
            </span>
          )}
        </div>
        
        <div className="mt-3 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User size={16} className="text-gray-400 mr-2" />
              <span className="font-medium">{formatTeamName(match.team1)}</span>
            </div>
            
            <div className="font-bold text-xl w-6 text-center">
              {match.beachTennisScore ? match.score1 : match.score1 || '-'}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User size={16} className="text-gray-400 mr-2" />
              <span className="font-medium">{formatTeamName(match.team2)}</span>
            </div>
            
            <div className="font-bold text-xl w-6 text-center">
              {match.beachTennisScore ? match.score2 : match.score2 || '-'}
            </div>
          </div>
          
          {match.completed && match.winnerId && (
            <div className="flex items-center justify-end mt-1 text-sm text-green-600">
              <Award size={14} className="mr-1" />
              <span>
                Vencedor: {match.winnerId === 'team1' ? formatTeamName(match.team1) : formatTeamName(match.team2)}
              </span>
            </div>
          )}
        </div>
        
        {showActions && !match.completed && (
          <div className="mt-4">
            <Button 
              onClick={() => openScoreModal(match)} 
              className="w-full"
              size="sm"
            >
              Registrar Resultado
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  // Tab rendering
  const renderTabContent = () => {
    switch (activeTab) {
      case 'current':
        return (
          <div>
            <h3 className="text-lg font-medium mb-3">Partidas Atuais</h3>
            {currentMatches.length === 0 ? (
              <p className="text-gray-500 text-center py-10">
                Não há partidas em andamento no momento.
              </p>
            ) : (
              <div className="space-y-4">
                {currentMatches.map(match => renderMatchCard(match))}
              </div>
            )}
          </div>
        );
        
      case 'upcoming':
        return (
          <div>
            <h3 className="text-lg font-medium mb-3">Próximas Partidas</h3>
            {upcomingMatches.length === 0 ? (
              <p className="text-gray-500 text-center py-10">
                Não há partidas agendadas.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.slice(0, 10).map(match => renderMatchCard(match, false))}
                {upcomingMatches.length > 10 && (
                  <p className="text-center text-sm text-gray-500">
                    + {upcomingMatches.length - 10} partidas agendadas
                  </p>
                )}
              </div>
            )}
          </div>
        );
        
      case 'completed':
        return (
          <div>
            <h3 className="text-lg font-medium mb-3">Partidas Completadas</h3>
            {completedMatches.length === 0 ? (
              <p className="text-gray-500 text-center py-10">
                Nenhuma partida foi concluída.
              </p>
            ) : (
              <div className="space-y-4">
                {completedMatches.slice(0, 10).map(match => renderMatchCard(match, false))}
                {completedMatches.length > 10 && (
                  <p className="text-center text-sm text-gray-500">
                    + {completedMatches.length - 10} partidas concluídas
                  </p>
                )}
              </div>
            )}
          </div>
        );
    }
  };
  
  return (
    <div>
      <h2 className="text-xl font-medium mb-6">Interface do Árbitro</h2>
      
      <div className="mb-6">
        <div className="border-b">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('current')}
              className={`pb-3 px-1 ${
                activeTab === 'current'
                  ? 'border-b-2 border-blue-500 font-medium text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Atuais ({currentMatches.length})
            </button>
            
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`pb-3 px-1 ${
                activeTab === 'upcoming'
                  ? 'border-b-2 border-blue-500 font-medium text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Próximas ({upcomingMatches.length})
            </button>
            
            <button
              onClick={() => setActiveTab('completed')}
              className={`pb-3 px-1 ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-500 font-medium text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Concluídas ({completedMatches.length})
            </button>
          </nav>
        </div>
      </div>
      
      <div className="mt-4">
        {renderTabContent()}
      </div>
      
      {/* Modal for registering match scores */}
      {selectedMatch && (
        <ModalRegistroGames
          match={selectedMatch}
          isOpen={isScoreModalOpen}
          onClose={() => setIsScoreModalOpen(false)}
          onSave={handleSaveScore}
          participantMap={participantMap}
          matchFormat={getMatchFormat(selectedMatch)}
        />
      )}
    </div>
  );
};

export default RefereeInterface;
