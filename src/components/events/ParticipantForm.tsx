import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { useEventsStore, useParticipantsStore } from '../../store';
import { Select } from '../ui/Select';
import { Loader2 } from 'lucide-react';
import { useNotificationStore } from '../ui/Notification';
import { CreateParticipantDTO } from '../../types'; // Import if not already

// Schema de validação para o formulário de participante
const participantSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Telefone deve ter pelo menos 8 dígitos'),
  birthDate: z.string().optional(), // Add birthDate to schema if using the field
  partner_id: z.string().optional(),
});

type ParticipantFormValues = z.infer<typeof participantSchema>;

interface ParticipantFormProps {
  eventId: string;
  onSuccess?: () => void;
}

export const ParticipantForm: React.FC<ParticipantFormProps> = ({ eventId, onSuccess }) => {
  const { currentEvent } = useEventsStore();
  const { createParticipant, eventParticipants, loading, fetchParticipantsByEvent } = useParticipantsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Verificar se o evento usa duplas formadas ou aleatórias
  const isFormedTeams = currentEvent?.teamFormation === 'FORMED';
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      birthDate: '', // Default value for birthDate
      partner_id: '', // Use empty string for select default
    }
  });

  useEffect(() => {
    if (eventId) {
      fetchParticipantsByEvent(eventId);
    }
  }, [eventId, fetchParticipantsByEvent]);

  // Filtrar participantes disponíveis para parceiros (sem dupla ainda)
  const availablePartners = eventParticipants.filter(
    participant => !participant.partnerId && participant.paymentStatus === 'CONFIRMED'
  );

  const onSubmit = async (data: ParticipantFormValues) => {
    setIsSubmitting(true);
    try {
      // Prepare data according to CreateParticipantDTO
      const participantData: CreateParticipantDTO = {
        eventId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: '',
        // Pass null if birthDate is empty/undefined
        birthDate: data.birthDate || null,
        // Pass null if partner_id is empty/undefined, unless team formation is RANDOM
        partnerId: isFormedTeams ? (data.partner_id || null) : null,
        paymentStatus: 'PENDING', // Default status when using this form
      };

      await createParticipant(participantData);

      addNotification({
        type: 'success',
        message: 'Participante cadastrado com sucesso!'
      });

      reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating participant:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao cadastrar participante'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Nome completo"
          error={errors.name?.message || ''}
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="seu@email.com"
          error={errors.email?.message || ''}
        />
      </div>
      
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="(00) 00000-0000"
          error={errors.phone?.message || ''}
        />
      </div>
      
      {/* Optional: Add BirthDate Input here if needed for this form */}
      {/*
      <div>
        <Label htmlFor="birthDate">Data de Nascimento</Label>
        <Input
          id="birthDate"
          type="date"
          {...register('birthDate')}
          error={errors.birthDate?.message || ''}
        />
      </div>
      */}

      {/* Mostrar campo de parceiro apenas se for duplas formadas */}
      {isFormedTeams && (
        <div>
          <Label htmlFor="partner_id">Parceiro</Label>
          <Select
            id="partner_id"
            {...register('partner_id')}
            error={!!errors.partner_id}
            errorMessage={errors.partner_id?.message || ''}
            disabled={loading}
          >
            <option value="">Selecione um parceiro (opcional)</option> {/* Allow no partner */}
            {availablePartners.map(partner => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Se o parceiro não estiver listado, registre-o primeiro. Apenas participantes confirmados aparecem.
          </p>
        </div>
      )}
      
      <div className="pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cadastrando...
            </>
          ) : (
            'Cadastrar Participante'
          )}
        </Button>
      </div>
    </form>
  );
};
