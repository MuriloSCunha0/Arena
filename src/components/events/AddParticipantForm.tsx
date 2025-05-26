import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useParticipantsStore } from '../../store/participantsStore';
import { UserSelector } from '../ui/UserSelector';
import { UserPlus, UserCheck } from 'lucide-react';

interface AddParticipantFormProps {
  eventId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ParticipantFormData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  category?: string;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
}

export const AddParticipantForm: React.FC<AddParticipantFormProps> = ({
  eventId,
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [entryMethod, setEntryMethod] = useState<'manual' | 'select'>('manual');
  const createParticipant = useParticipantsStore(state => state.createParticipant);
  
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ParticipantFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
    }
  });

  // Handle when a user is selected from the UserSelector
  const handleUserSelect = (user: UserData | null) => {
    setSelectedUser(user);
    
    if (user) {
      // Fill form fields with user data
      setValue('name', user.full_name || '');
      setValue('email', user.email || '');
      setValue('phone', user.phone || '');
      setValue('cpf', user.cpf || '');
    } else {
      // Clear form if user selection is canceled
      reset();
    }
  };

  const onSubmit = async (data: ParticipantFormData) => {
    setIsSubmitting(true);
    try {
      await createParticipant({
        eventId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf, 
        // If using selected user, pass the userId for better tracking
        userId: selectedUser?.id
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error adding participant:', error);
      alert(`Erro ao adicionar participante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Entry Method Toggle */}
      <div className="flex space-x-2 mb-4">
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
            entryMethod === 'manual' 
              ? 'bg-brand-blue text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setEntryMethod('manual')}
        >
          <UserPlus size={18} className="mr-2" />
          Inserir Manualmente
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
            entryMethod === 'select' 
              ? 'bg-brand-green text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setEntryMethod('select')}
        >
          <UserCheck size={18} className="mr-2" />
          Selecionar Usuário
        </button>
      </div>

      {entryMethod === 'select' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar usuário do sistema
          </label>
          <UserSelector 
            onSelect={handleUserSelect}
            onCancel={() => setEntryMethod('manual')}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome"
          placeholder="Nome completo"
          {...register("name", { required: "Nome é obrigatório" })}
          error={errors.name?.message}
          disabled={entryMethod === 'select' && selectedUser !== null}
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
          disabled={entryMethod === 'select' && selectedUser !== null}
        />
        
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          {...register("phone", { required: "Telefone é obrigatório" })}
          error={errors.phone?.message}
          disabled={entryMethod === 'select' && selectedUser !== null}
        />
        
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
          disabled={entryMethod === 'select' && selectedUser !== null}
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
    </div>
  );
};
