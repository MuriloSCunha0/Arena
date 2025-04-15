import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  Loader2, 
  CheckCircle,
  XCircle,
  Percent
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useOrganizersStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { Organizer } from '../../types';

export const OrganizersList: React.FC = () => {
  const { organizers, loading, error, fetchOrganizers, deleteOrganizer } = useOrganizersStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchOrganizers();
      } catch (err) {
        // Error will be handled in the store
      }
    };
    
    loadData();
  }, [fetchOrganizers]);
  
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  // Filter organizers by search term
  const filteredOrganizers = organizers.filter(organizer =>
    organizer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    organizer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    organizer.phone.includes(searchTerm)
  );
  
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o organizador "${name}"?`)) {
      try {
        await deleteOrganizer(id);
        addNotification({
          type: 'success',
          message: 'Organizador excluído com sucesso!'
        });
      } catch (err) {
        // Error notification handled by the store
      }
    }
  };
  
  if (loading && organizers.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-blue">Organizadores</h1>
          <p className="text-gray-500">Gerencie os organizadores de eventos da sua arena</p>
        </div>
        
        <Link to="/organizadores/novo">
          <Button>
            <UserPlus size={18} className="mr-1" />
            Novo Organizador
          </Button>
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar organizadores..."
              className="pl-10 pr-4 py-2 border border-brand-gray rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-green"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {filteredOrganizers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-gray">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIX</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray">
                {filteredOrganizers.map((organizer: Organizer) => (
                  <tr key={organizer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-brand-blue">{organizer.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{organizer.phone}</div>
                      {organizer.email && <div className="text-sm text-gray-500">{organizer.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {organizer.pixKey || <span className="text-gray-400 italic">Não definido</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Percent size={16} className="text-brand-purple mr-1" />
                        <span>{organizer.defaultCommissionRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {organizer.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={14} className="mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle size={14} className="mr-1" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Link to={`/organizadores/${organizer.id}/editar`}>
                          <Button variant="outline" className="px-2 py-1">
                            <Edit size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="danger"
                          className="px-2 py-1"
                          onClick={() => handleDelete(organizer.id, organizer.name)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum organizador encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece adicionando organizadores para seus eventos.
            </p>
            <div className="mt-6">
              <Link to="/organizadores/novo">
                <Button>
                  <UserPlus size={18} className="mr-1" />
                  Novo Organizador
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
