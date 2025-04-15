import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../ui/Notification';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { OrganizerService, EventOrganizer } from '../../services/organizerService';
import { User, UserPlus, Trash2, Edit2, Mail, AtSign, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface EventOrganizersManagerProps {
  eventId: string;
}

export const EventOrganizersManager: React.FC<EventOrganizersManagerProps> = ({ eventId }) => {
  const [organizers, setOrganizers] = useState<EventOrganizer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedOrganizer, setSelectedOrganizer] = useState<EventOrganizer | null>(null);
  const [selectedRole, setSelectedRole] = useState<EventOrganizer['role']>('ORGANIZER');
  const addNotification = useNotificationStore(state => state.addNotification);
  const { user: currentUser } = useAuthStore();
  
  const fetchOrganizers = async () => {
    setLoading(true);
    try {
      const data = await OrganizerService.getEventOrganizers(eventId);
      setOrganizers(data);
    } catch (error) {
      console.error('Error fetching organizers:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao carregar organizadores'
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOrganizers();
  }, [eventId]);
  
  const handleAddOrganizer = async () => {
    if (!email.trim()) {
      addNotification({
        type: 'warning',
        message: 'Por favor, informe um email válido'
      });
      return;
    }
    
    setLoading(true);
    try {
      // Buscar usuário pelo email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single();
      
      if (userError || !userData) {
        throw new Error('Usuário não encontrado com este email');
      }
      
      // Adicionar como organizador
      await OrganizerService.addOrganizer(eventId, userData.id, selectedRole);
      
      addNotification({
        type: 'success',
        message: 'Organizador adicionado com sucesso!'
      });
      
      setShowAddModal(false);
      setEmail('');
      fetchOrganizers();
    } catch (error) {
      console.error('Error adding organizer:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Falha ao adicionar organizador'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRole = async () => {
    if (!selectedOrganizer) return;
    
    setLoading(true);
    try {
      await OrganizerService.updateOrganizerRole(selectedOrganizer.id, selectedRole);
      
      addNotification({
        type: 'success',
        message: 'Função do organizador atualizada com sucesso!'
      });
      
      setShowEditModal(false);
      fetchOrganizers();
    } catch (error) {
      console.error('Error updating organizer role:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao atualizar função do organizador'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveOrganizer = async (organizer: EventOrganizer) => {
    // Não permitir remover a si mesmo se for o único administrador
    if (organizer.userId === currentUser?.id) {
      const admins = organizers.filter(o => o.role === 'ADMIN');
      if (admins.length === 1 && admins[0].userId === currentUser.id) {
        addNotification({
          type: 'warning',
          message: 'Você não pode remover a si mesmo como único administrador'
        });
        return;
      }
    }
    
    if (confirm(`Tem certeza que deseja remover ${organizer.user?.user_metadata?.name || 'este organizador'}?`)) {
      setLoading(true);
      try {
        await OrganizerService.removeOrganizer(organizer.id);
        
        addNotification({
          type: 'success',
          message: 'Organizador removido com sucesso!'
        });
        
        fetchOrganizers();
      } catch (error) {
        console.error('Error removing organizer:', error);
        addNotification({
          type: 'error',
          message: 'Falha ao remover organizador'
        });
      } finally {
        setLoading(false);
      }
    }
  };
  
  const openEditModal = (organizer: EventOrganizer) => {
    setSelectedOrganizer(organizer);
    setSelectedRole(organizer.role);
    setShowEditModal(true);
  };
  
  // Verificar se o usuário atual é administrador do evento
  const isCurrentUserAdmin = organizers.some(
    org => org.userId === currentUser?.id && org.role === 'ADMIN'
  );
  
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-brand-purple/20 text-brand-purple';
      case 'ORGANIZER':
        return 'bg-brand-green/20 text-brand-green';
      case 'ASSISTANT':
        return 'bg-brand-blue/20 text-brand-blue';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'ORGANIZER':
        return 'Organizador';
      case 'ASSISTANT':
        return 'Assistente';
      default:
        return role;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-brand-blue">Organizadores do Evento</h3>
        {isCurrentUserAdmin && (
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <UserPlus size={16} className="mr-1" />
            Adicionar Organizador
          </Button>
        )}
      </div>
      
      {loading && organizers.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">Carregando organizadores...</p>
        </div>
      ) : organizers.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
          <User size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Nenhum organizador cadastrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Função
                </th>
                {isCurrentUserAdmin && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizers.map((organizer) => (
                <tr key={organizer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-brand-blue/10 rounded-full flex items-center justify-center">
                        <User size={16} className="text-brand-blue" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {organizer.user?.user_metadata?.name || 'Nome não disponível'}
                          {organizer.userId === currentUser?.id && (
                            <span className="ml-2 text-xs text-gray-500">(Você)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{organizer.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(organizer.role)}`}>
                      {getRoleLabel(organizer.role)}
                    </span>
                  </td>
                  {isCurrentUserAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(organizer)}
                        className="text-brand-blue hover:text-brand-blue/70 mr-3"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveOrganizer(organizer)}
                        className="text-brand-orange hover:text-brand-orange/70"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal para adicionar organizador */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Adicionar Organizador"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email do Usuário
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite o email do usuário"
              icon={<Mail size={16} />}
            />
            <p className="mt-1 text-xs text-gray-500">
              O usuário deve estar cadastrado no sistema
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => setSelectedRole('ADMIN')}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-colors
                  ${selectedRole === 'ADMIN' 
                    ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Administrador
              </div>
              <div
                onClick={() => setSelectedRole('ORGANIZER')}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-colors
                  ${selectedRole === 'ORGANIZER' 
                    ? 'border-brand-green bg-brand-green/10 text-brand-green' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Organizador
              </div>
              <div
                onClick={() => setSelectedRole('ASSISTANT')}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-colors
                  ${selectedRole === 'ASSISTANT' 
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Assistente
              </div>
            </div>
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
              onClick={handleAddOrganizer}
              loading={loading}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal para editar função */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Função do Organizador"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-4 pb-4 border-b">
            <div className="flex-shrink-0 h-12 w-12 bg-brand-blue/10 rounded-full flex items-center justify-center">
              <User size={24} className="text-brand-blue" />
            </div>
            <div>
              <p className="font-medium">{selectedOrganizer?.user?.user_metadata?.name || 'Usuário'}</p>
              <p className="text-sm text-gray-500 flex items-center">
                <AtSign size={14} className="mr-1" />
                {selectedOrganizer?.user?.email}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => setSelectedRole('ADMIN')}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-colors
                  ${selectedRole === 'ADMIN' 
                    ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Administrador
              </div>
              <div
                onClick={() => setSelectedRole('ORGANIZER')}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-colors
                  ${selectedRole === 'ORGANIZER' 
                    ? 'border-brand-green bg-brand-green/10 text-brand-green' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Organizador
              </div>
              <div
                onClick={() => setSelectedRole('ASSISTANT')}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-colors
                  ${selectedRole === 'ASSISTANT' 
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' 
                    : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Assistente
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateRole}
              loading={loading}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
