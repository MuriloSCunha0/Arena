import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, ChevronDown, Users, Ticket, Clock, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EventType, TeamFormationType } from '../../types';
import { useEventsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';

export const EventsList = () => {
  const { events, loading, error, fetchEvents } = useEventsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchEvents().catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar eventos. Tente novamente mais tarde.'
      });
    });
  }, [fetchEvents, addNotification]);

  useEffect(() => {
    // Mostrar erro caso ocorra
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  const filteredEvents = events.filter(event => {
    // Filter by search term
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    // Filter by event type
    const matchesType = filterType === 'all' || 
                        (filterType === 'tournament' && event.type === EventType.TOURNAMENT) ||
                        (filterType === 'pool' && event.type === EventType.POOL);
    
    return matchesSearch && matchesType;
  });

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Eventos</h1>
        <Link to="/eventos/novo">
          <Button>+ Novo Evento</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar eventos..."
            className="pl-10 pr-4 py-2 border border-brand-gray rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-green"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-48">
          <select
            className="w-full appearance-none bg-white border border-brand-gray rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-green"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="tournament">Torneios</option>
            <option value="pool">Bolões</option>
          </select>
          <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={32} className="animate-spin text-brand-green" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-brand-gray overflow-hidden">
          <div className="overflow-x-auto">
            {filteredEvents.length > 0 ? (
              <table className="min-w-full divide-y divide-brand-gray">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscritos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-brand-gray">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-blue">{event.title}</div>
                        <div className="text-xs text-gray-500">{event.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.type === EventType.TOURNAMENT 
                            ? 'bg-brand-green/20 text-brand-green' 
                            : 'bg-brand-purple/20 text-brand-purple'
                        }`}>
                          {event.type === EventType.TOURNAMENT ? 'Torneio' : 'Bolão'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar size={14} className="mr-1" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock size={14} className="mr-1" />
                          <span>{event.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Users size={14} className="mr-1" />
                          <span>0/{event.maxParticipants}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Ticket size={14} className="mr-1" />
                          <span>R$ {event.price}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <Link to={`/eventos/${event.id}`}>
                            <Button variant="outline" className="px-3 py-1">Ver</Button>
                          </Link>
                          <Link to={`/eventos/${event.id}/editar`}>
                            <Button variant="outline" className="px-3 py-1">Editar</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-gray-500">
                Nenhum evento encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
