import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, Trophy, Bell, MapPin } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Painel do Participante</h1>
          <p className="text-gray-600 mt-2">Bem-vindo de volta! Veja suas atividades recentes</p>
        </div>
        
        {/* Alerta de convites pendentes */}
        {pendingInvites.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  {pendingInvites.length} {pendingInvites.length === 1 ? 'Convite Pendente' : 'Convites Pendentes'}!
                </h3>
                <p className="text-yellow-700 mb-4">
                  {pendingInvites.length === 1 
                    ? 'Um participante te convidou para ser parceiro em um evento.' 
                    : `${pendingInvites.length} participantes te convidaram para ser parceiro em eventos.`}
                </p>
                <Link to="/participante/convites">
                  <Button 
                    variant="primary" 
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Ver convites
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Próximos eventos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900">
              <Calendar className="mr-3 text-brand-blue" size={20} />
              Próximos Eventos
            </h2>
            <Link to="/meus-torneios">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Ver Todos
              </Button>
            </Link>
          </div>
          
          <div className="p-6">
            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {upcomingEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 hover:shadow-lg transition-all duration-200"
                  >
                    <h3 className="font-semibold text-lg mb-4 text-gray-900 line-clamp-2">{event.title}</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-600">
                        <div className="p-1.5 bg-green-100 rounded-lg mr-3">
                          <Clock size={14} className="text-green-600" />
                        </div>
                        <span className="text-sm font-medium">{formatDate(event.date)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <div className="p-1.5 bg-red-100 rounded-lg mr-3">
                          <MapPin size={14} className="text-red-600" />
                        </div>
                        <span className="text-sm line-clamp-1">{event.location}</span>
                      </div>
                      
                      {event.partner_name && (
                        <div className="flex items-center text-gray-600">
                          <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                            <Users size={14} className="text-purple-600" />
                          </div>
                          <span className="text-sm">Parceiro: {event.partner_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <Link to={`/eventos/${event.id}`} className="block">
                      <Button variant="primary" className="w-full">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 rounded-xl inline-block mb-4">
                  <Calendar className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum evento agendado</h3>
                <p className="text-gray-500 mb-6">
                  Você não possui eventos próximos. Que tal explorar novos eventos?
                </p>
                <Link to="/eventos-disponiveis">
                  <Button 
                    variant="primary" 
                    className="bg-gradient-to-r from-brand-green to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    Explorar Eventos
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Links rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/eventos-disponiveis" className="block group">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg group-hover:shadow-xl group-hover:scale-105 duration-200">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-8 w-8" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Eventos Disponíveis</h3>
              <p className="text-sm text-blue-100">
                Explore e inscreva-se em novos eventos
              </p>
            </div>
          </Link>
          
          <Link to="/meus-torneios" className="block group">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 hover:from-green-600 hover:to-green-700 transition-all shadow-lg group-hover:shadow-xl group-hover:scale-105 duration-200">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="h-8 w-8" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Meus Torneios</h3>
              <p className="text-sm text-green-100">
                Veja seus torneios atuais e passados
              </p>
            </div>
          </Link>
          
          <Link to="/perfil" className="block group md:col-span-2 lg:col-span-1">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg group-hover:shadow-xl group-hover:scale-105 duration-200">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Meu Perfil</h3>
              <p className="text-sm text-purple-100">
                Atualize seus dados e preferências
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
