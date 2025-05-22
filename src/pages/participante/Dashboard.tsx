import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, Trophy, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useParticipant } from '../../hooks/useParticipant';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';
import { PartnerInvites } from '../../components/PartnerInvites';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { getParticipantTournaments, fetchPendingInvites, pendingInvites, loading } = useParticipant();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoadingData(true);
        
        // Buscar torneios e convites em paralelo
        const [tournaments] = await Promise.all([
          getParticipantTournaments(user.id),
          fetchPendingInvites(user.id)
        ]);
        
        setUpcomingEvents(tournaments.upcomingTournaments.slice(0, 3)); // Mostrar os 3 próximos
      } catch (error) {
        console.error('Error fetching participant data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, [user, getParticipantTournaments, fetchPendingInvites]);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Painel do Participante</h1>
      
      {/* Alerta de convites pendentes */}
      {pendingInvites.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <Bell className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Você tem {pendingInvites.length} {pendingInvites.length === 1 ? 'convite pendente' : 'convites pendentes'}!
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {pendingInvites.length === 1 
                  ? 'Um participante te convidou para ser parceiro em um evento.' 
                  : `${pendingInvites.length} participantes te convidaram para ser parceiro em eventos.`}
              </p>
              <div className="mt-3">
                <Link to="/convites" className="text-sm font-medium text-yellow-800 hover:text-yellow-900">
                  Ver convites →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Próximos eventos */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Calendar className="mr-2 text-brand-blue" size={20} />
            Próximos Eventos
          </h2>
          <Link to="/meus-torneios">
            <Button variant="outline" size="sm">Ver Todos</Button>
          </Link>
        </div>
        
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map(event => (
              <div 
                key={event.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <h3 className="font-medium text-lg mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  <Clock size={14} className="mr-1" /> {formatDate(event.date)}
                </p>
                <p className="text-sm text-gray-600 mb-2">📍 {event.location}</p>
                
                {event.partner_name && (
                  <p className="text-xs bg-blue-50 text-blue-700 p-1 rounded flex items-center mb-3">
                    <Users size={12} className="mr-1" /> Parceiro: {event.partner_name}
                  </p>
                )}
                
                <Link to={`/eventos/${event.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Detalhes
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-gray-600 font-medium">Nenhum evento agendado</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">
              Você não possui eventos próximos.
            </p>
            <Link to="/eventos-disponiveis">
              <Button variant="primary" size="sm">
                Explorar Eventos
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* Meus Convites */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Bell className="mr-2 text-brand-purple" size={20} />
            Convites Pendentes
          </h2>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <PartnerInvites />
          </div>
        </div>
      )}
      
      {/* Links rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/eventos-disponiveis" className="block">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md">
            <Calendar className="h-8 w-8 mb-2" />
            <h3 className="text-lg font-medium mb-1">Eventos Disponíveis</h3>
            <p className="text-sm opacity-80">
              Explore e inscreva-se em novos eventos
            </p>
          </div>
        </Link>
        
        <Link to="/meus-torneios" className="block">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 hover:from-green-600 hover:to-green-700 transition-all shadow-md">
            <Trophy className="h-8 w-8 mb-2" />
            <h3 className="text-lg font-medium mb-1">Meus Torneios</h3>
            <p className="text-sm opacity-80">
              Veja seus torneios atuais e passados
            </p>
          </div>
        </Link>
        
        <Link to="/perfil" className="block">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 hover:from-purple-600 hover:to-purple-700 transition-all shadow-md">
            <Users className="h-8 w-8 mb-2" />
            <h3 className="text-lg font-medium mb-1">Meu Perfil</h3>
            <p className="text-sm opacity-80">
              Atualize seus dados e preferências
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
