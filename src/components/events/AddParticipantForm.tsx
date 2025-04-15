import React, { useState } from 'react';
import { User, Mail, Phone, Check, Loader2, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useParticipantsStore, useFinancialsStore } from '../../store';
import { Participant, CreateParticipantDTO } from '../../types'; // Import CreateParticipantDTO

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
  const { createParticipant, loading } = useParticipantsStore();
  const { fetchEventSummary } = useFinancialsStore();

  // Use state matching CreateParticipantDTO structure more closely
  const [formData, setFormData] = useState<Partial<CreateParticipantDTO>>({
    eventId,
    name: '',
    email: '',
    phone: '',
    birthDate: '', // Keep as string for input compatibility, convert to null on submit if empty
    paymentStatus: 'PENDING',
    paymentId: undefined, // Initialize paymentId
    partnerId: undefined, // Initialize partnerId
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare data strictly according to CreateParticipantDTO
      const participantData: CreateParticipantDTO = {
        eventId: formData.eventId!, // Assume eventId is always present
        name: formData.name!,
        email: formData.email!,
        phone: formData.phone!,
        // Convert empty string to null for birthDate before sending
        birthDate: formData.birthDate || null, // Send null if empty
        paymentStatus: formData.paymentStatus || 'PENDING',
        // Generate paymentId only if confirming payment manually here
        paymentId: formData.paymentStatus === 'CONFIRMED' ? `manual_${Date.now()}` : null,
        partnerId: formData.partnerId || null, // Send null if empty/undefined
      };

      await createParticipant(participantData);

      // If the payment was confirmed, update the financial summary
      if (formData.paymentStatus === 'CONFIRMED') {
        await fetchEventSummary(eventId);
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding participant:', error);
      // Consider showing error notification to user
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

      {/* Added birthDate field */}
      <Input
        type="date"
        label="Data de Nascimento"
        name="birthDate" // Match state key
        value={formData.birthDate || ''} // Ensure value is string or undefined
        onChange={handleChange}
        icon={<Calendar size={18} />}
        placeholder="Data de nascimento"
        // Add max date validation if needed (e.g., max={new Date().toISOString().split('T')[0]})
      />

      {/* Payment Status */}
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

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        {/* ... Cancel and Submit buttons ... */}
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
