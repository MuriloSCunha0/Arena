import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useOrganizersStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { Organizer } from '../../types';

export const OrganizerForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const { currentOrganizer, loading, error, fetchOrganizerById, createOrganizer, updateOrganizer, clearCurrentOrganizer } = useOrganizersStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [formData, setFormData] = useState<Partial<Organizer>>({
    name: '',
    phone: '',
    email: '',
    pixKey: '',
    defaultCommissionRate: 0,
    active: true
  });
  
  // Load organizer data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      fetchOrganizerById(id);
    }
    
    return () => {
      clearCurrentOrganizer();
    };
  }, [isEditMode, id, fetchOrganizerById, clearCurrentOrganizer]);
  
  // Update form data when organizer data is loaded
  useEffect(() => {
    if (currentOrganizer) {
      setFormData(currentOrganizer);
    }
  }, [currentOrganizer]);
  
  // Show errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else if (name === 'defaultCommissionRate') {
      // Ensure commission rate is a number and capped at 100%
      const numValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : Math.min(numValue, 100)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && id) {
        await updateOrganizer(id, formData);
        addNotification({
          type: 'success',
          message: 'Organizador atualizado com sucesso!'
        });
      } else {
        await createOrganizer(formData);
        addNotification({
          type: 'success',
          message: 'Organizador criado com sucesso!'
        });
      }
      navigate('/organizadores');
    } catch (error) {
      // Error notifications are handled by the store
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button 
          onClick={() => navigate('/organizadores')}
          className="mr-4 p-2 rounded-full hover:bg-brand-gray/30"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-brand-blue">
          {isEditMode ? 'Editar Organizador' : 'Novo Organizador'}
        </h1>
      </div>
      
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              placeholder="Nome do organizador"
            />
            
            <Input
              label="Telefone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              required
              placeholder="(00) 00000-0000"
            />
            
            <Input
              type="email"
              label="Email"
              name="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              placeholder="email@exemplo.com"
            />
            
            <Input
              label="Chave PIX"
              name="pixKey"
              value={formData.pixKey || ''}
              onChange={handleInputChange}
              placeholder="CPF/CNPJ/Email/Telefone/Chave aleatória"
            />
            
            <div className="flex flex-col space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Taxa de Comissão (%)
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="defaultCommissionRate"
                  value={formData.defaultCommissionRate || 0}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="focus:ring-brand-green focus:border-brand-green block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Porcentagem padrão da comissão sobre as inscrições
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formData.active || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
              />
              <label htmlFor="active" className="font-medium text-gray-700">
                Organizador ativo
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/organizadores')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
