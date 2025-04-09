import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Award, 
  Tag, 
  DollarSign,
  ChevronRight,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formattedDate, formattedCurrency } from '../../utils/formatters';
import { Tournament } from '../../types';

// Define a type for tournament status
type TournamentStatus = 'CREATED' | 'STARTED' | 'FINISHED';

interface TournamentCardProps {
  tournament: {
    id: string;
    title: string;
    description?: string;
    date: string;
    time: string;
    location: string;
    price: number;
    max_participants: number;
    prize?: string;
    categories?: string[];
    banner_image_url?: string;
    status?: TournamentStatus;
  };
  showActions?: boolean;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ 
  tournament, 
  showActions = true 
}) => {
  const navigate = useNavigate();
  
  const {
    id,
    title,
    description,
    date,
    time,
    location,
    price,
    max_participants,
    prize,
    categories,
    banner_image_url,
    status
  } = tournament;
  
  // Type-safe status mappings
  const statusColorMap: Record<TournamentStatus, string> = {
    CREATED: 'bg-blue-100 text-blue-800',
    STARTED: 'bg-green-100 text-green-800',
    FINISHED: 'bg-purple-100 text-purple-800',
  };
  
  const statusIconMap: Record<TournamentStatus, JSX.Element> = {
    CREATED: <PauseCircle size={14} className="mr-1" />,
    STARTED: <PlayCircle size={14} className="mr-1" />,
    FINISHED: <Award size={14} className="mr-1" />,
  };
  
  const statusTextMap: Record<TournamentStatus, string> = {
    CREATED: 'Em breve',
    STARTED: 'Em andamento',
    FINISHED: 'Concluído',
  };
  
  // Safe access with fallbacks
  const statusColor = status && statusColorMap[status] ? statusColorMap[status] : 'bg-gray-100 text-gray-800';
  const statusIcon = status && statusIconMap[status] ? statusIconMap[status] : null;
  const statusText = status && statusTextMap[status] ? statusTextMap[status] : 'Não definido';
  
  const navigateToDetail = () => {
    navigate(`/events/${id}`);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300">
      {/* Banner/Image */}
      <div className="h-40 bg-brand-blue/10 relative">
        {banner_image_url ? (
          <img 
            src={banner_image_url} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-brand-blue/20 to-brand-green/20">
            <Award size={64} className="text-gray-400" />
          </div>
        )}
        
        {/* Status badge */}
        <div className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-medium flex items-center ${statusColor}`}>
          {statusIcon}
          {statusText}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-brand-blue truncate">{title}</h3>
        
        {description && (
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar size={16} className="mr-2 text-brand-blue" />
            <span>{formattedDate(date)}</span>
            <Clock size={16} className="ml-3 mr-2 text-brand-blue" />
            <span>{time}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={16} className="mr-2 text-brand-blue" />
            <span className="truncate">{location}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <DollarSign size={16} className="mr-2 text-brand-blue" />
            <span>{formattedCurrency(price)}</span>
            <Users size={16} className="ml-3 mr-2 text-brand-blue" />
            <span>Máx: {max_participants}</span>
          </div>
          
          {prize && (
            <div className="flex items-start text-sm text-gray-500">
              <Award size={16} className="mr-2 text-brand-blue flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{prize}</span>
            </div>
          )}
          
          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {categories.map((category: string, index: number) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-2 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs"
                >
                  <Tag size={12} className="mr-1" />
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      {showActions && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={navigateToDetail}
            className="flex items-center"
          >
            Ver Detalhes
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

interface TournamentCardListProps {
  tournaments: TournamentCardProps['tournament'][]; // Use Tournament[] quando tiver disponível
  loading?: boolean;
  emptyMessage?: string;
}

export const TournamentCardList: React.FC<TournamentCardListProps> = ({
  tournaments,
  loading = false,
  emptyMessage = "Nenhum torneio encontrado"
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 h-96">
            <div className="h-40 bg-gray-200" />
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded w-20" />
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50">
              <div className="h-8 bg-gray-200 rounded w-32 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <Award className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">{emptyMessage}</h3>
        <p className="mt-1 text-sm text-gray-500">
          Crie um torneio para começar.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament) => (
        <TournamentCard key={tournament.id} tournament={tournament} />
      ))}
    </div>
  );
};
