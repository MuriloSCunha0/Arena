import React from 'react';
import { CheckCircle, Clock, MapPin, Edit3 } from 'lucide-react'; // Import icons

interface TeamInfo {
  name: string;
  // Add other team info if needed, e.g., avatarUrl
}

interface MatchCardProps {
  teamA: TeamInfo | null;
  teamB: TeamInfo | null;
  scoreA?: number;
  scoreB?: number;
  winner?: 'team1' | 'team2' | null;
  onClick?: () => void;
  highlighted?: boolean;
  byeMatch?: boolean; // Indicates if this was a bye match
  court?: string;
  scheduledTime?: string;
  completed?: boolean; // Add completed prop
  edited?: boolean; // Indica se a partida foi editada após ser concluída
}

export const MatchCard: React.FC<MatchCardProps> = ({
  teamA,
  teamB,
  scoreA,
  scoreB,
  winner,
  onClick,
  highlighted = false,
  byeMatch = false,
  court,
  scheduledTime,
  completed = false,
  edited = false,
}) => {
  const teamAStyle = winner === 'team1' ? 'font-bold text-brand-green' : winner === 'team2' ? 'text-gray-400' : 'text-gray-800';
  const teamBStyle = winner === 'team2' ? 'font-bold text-brand-green' : winner === 'team1' ? 'text-gray-400' : 'text-gray-800';
  const scoreAStyle = winner === 'team1' ? 'font-bold text-brand-green' : winner === 'team2' ? 'text-gray-500' : 'text-gray-700';
  const scoreBStyle = winner === 'team2' ? 'font-bold text-brand-green' : winner === 'team1' ? 'text-gray-500' : 'text-gray-700';

  // Get team name string whether it's an object or string
  const getTeamName = (team: TeamInfo | string | null): string => {
    if (team === null) return 'A definir';
    if (typeof team === 'string') return team;
    return team.name || 'A definir';
  };

  const teamAName = getTeamName(teamA);
  const teamBName = getTeamName(teamB);

  const cardBaseStyle = "border rounded-lg p-3 w-full text-sm transition-all duration-200 relative"; 
  const cardBorderStyle = highlighted ? 'border-brand-blue shadow-md' : 'border-gray-200';
  const cardBgStyle = highlighted ? 'bg-blue-50' : 'bg-white';
  const clickableStyle = onClick ? 'cursor-pointer hover:shadow-sm hover:border-gray-300' : '';

  return (
    <div
      className={`${cardBaseStyle} ${cardBorderStyle} ${cardBgStyle} ${clickableStyle}`}
      onClick={onClick}
    >      {/* Completed and Edited Indicators */}
      {completed && !byeMatch && (
        <div className="absolute top-1 right-1 flex gap-1">
          <div className="text-green-500" title="Partida Concluída">
            <CheckCircle size={14} />
          </div>
          {edited && (
            <div className="text-orange-500 ml-1" title="Resultado Editado após finalização">
              <Edit3 size={14} />
            </div>
          )}
        </div>
      )}

      {/* Bye Indicator */}
      {byeMatch && (
        <div className="text-center text-xs text-gray-400 italic mb-2">
          BYE
        </div>
      )}

      {/* Team A */}
      <div className={`flex justify-between items-center ${teamAStyle}`}>
        <span className="truncate flex-1 mr-2">{teamAName}</span>
        <span className={`w-6 text-right ${scoreAStyle}`}>{scoreA ?? '-'}</span>
      </div>

      {/* Separator */}
      <div className="my-1 border-t border-dashed"></div>

      {/* Team B */}
      <div className={`flex justify-between items-center ${teamBStyle}`}>
        <span className="truncate flex-1 mr-2">{teamBName}</span>
        <span className={`w-6 text-right ${scoreBStyle}`}>{scoreB ?? '-'}</span>
      </div>

      {/* Court and Time Info */}
      {(court || scheduledTime) && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
          {court && (
            <span className="flex items-center">
              <MapPin size={12} className="mr-1 opacity-70" /> {court}
            </span>
          )}
          {scheduledTime && (
            <span className="flex items-center">
              <Clock size={12} className="mr-1 opacity-70" /> {scheduledTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
