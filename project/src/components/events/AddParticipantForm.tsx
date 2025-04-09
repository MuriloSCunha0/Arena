import React, { useState } from 'react';
import { User, Mail, Phone, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useParticipantsStore, useFinancialsStore } from '../../store';
import { Participant } from '../../types';

interface AddParticipantFormProps {
  eventId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddParticipantForm: React.FC<AddParticipantFormProps> = ({ 
  eventId, 
  onSuccess, 
  onCancel 
}) => {
  const { addParticipant, loading } = useParticipantsStore();
  const { fetchEventSummary } = useFinancialsStore();
  
  const [formData, setFormData] = useState<Partial<Participant>>({
    eventId,
    name: '',
    email: '',
    phone: '',
    paymentStatus: 'PENDING',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Se o status é confirmado, geramos um ID de pagamento fictício
      const paymentId = formData.paymentStatus === 'CONFIRMED' 
        ? `pix_${Date.now()}_manual` 
        : undefined;

      // Incluir o paymentId no formData se estiver definido
      const participantData = paymentId 
        ? { ...formData, paymentId }
        : formData;
      
      await addParticipant(participantData);
      
      // Se o pagamento foi confirmado, atualizar o resumo financeiro
      if (formData.paymentStatus === 'CONFIRMED') {
        await fetchEventSummary(eventId);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome completo"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
        icon={<User size={18} />}
        placeholder="Digite o nome do participante"
      />
      
      <Input
        type="email"
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        required
        icon={<Mail size={18} />}
        placeholder="Digite o email do participante"
      />
      
      <Input
        label="Telefone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        required
        icon={<Phone size={18} />}
        placeholder="(00) 00000-0000"
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status de Pagamento
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="paymentStatus"
              value="PENDING"
              checked={formData.paymentStatus === 'PENDING'}
              onChange={handleChange}
              className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
            />
            <span className="ml-2 text-sm text-gray-700">Pendente</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="paymentStatus"
              value="CONFIRMED"
              checked={formData.paymentStatus === 'CONFIRMED'}
              onChange={handleChange}
              className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
            />
            <span className="ml-2 text-sm text-gray-700">Pago</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
              <Loader2 size={16} className="mr-2 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Check size={16} className="mr-2" />
              Adicionar Participante
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
