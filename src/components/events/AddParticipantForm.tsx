import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useParticipantsStore } from '../../store/participantsStore';

interface AddParticipantFormProps {
  eventId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ParticipantFormData {
  name: string;
  email: string;
  phone: string;
  cpf: string; // Campo CPF adicionado
  category?: string;
}

export const AddParticipantForm: React.FC<AddParticipantFormProps> = ({
  eventId,
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createParticipant = useParticipantsStore(state => state.createParticipant);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ParticipantFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '', // Valor padrão para CPF
    }
  });

  const onSubmit = async (data: ParticipantFormData) => {
    setIsSubmitting(true);
    try {
      await createParticipant({
        eventId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf, 
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error adding participant:', error);
      // Adicione um alerta ou notificação para o usuário
      alert(`Erro ao adicionar participante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome"
        placeholder="Nome completo"
        {...register("name", { required: "Nome é obrigatório" })}
        error={errors.name?.message}
      />
      
      <Input
        label="E-mail"
        placeholder="email@exemplo.com"
        type="email"
        {...register("email", { 
          required: "E-mail é obrigatório",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: "E-mail inválido"
          }
        })}
        error={errors.email?.message}
      />
      
      <Input
        label="Telefone"
        placeholder="(00) 00000-0000"
        {...register("phone", { required: "Telefone é obrigatório" })}
        error={errors.phone?.message}
      />
      
      {/* Campo CPF com register aplicado corretamente */}
      <Input
        label="CPF"
        placeholder="000.000.000-00"
        {...register("cpf", { 
          required: "CPF é obrigatório",
          pattern: {
            value: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
            message: "Formato de CPF inválido"
          }
        })}
        error={errors.cpf?.message}
      />
      
      <div className="flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          loading={isSubmitting}
        >
          Adicionar
        </Button>
      </div>
    </form>
  );
};
