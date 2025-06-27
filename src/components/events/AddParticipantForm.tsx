import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useParticipantsStore } from '../../store/participantsStore';
import { UserSelector } from '../ui/UserSelector';
import { UserPlus, UserCheck, Users } from 'lucide-react';
import { supabase } from "../../lib/supabase";

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
  isAlreadyRegistered?: boolean;
}

export const AddParticipantForm: React.FC<AddParticipantFormProps> = ({
  eventId,
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  // Mudar o modo padrão para 'select' ao abrir o formulário
  const [entryMethod, setEntryMethod] = useState<'manual' | 'select' | 'multi'>('select');
  const [multiSelectedUsers, setMultiSelectedUsers] = useState<UserData[]>([]);
  const [multiUsers, setMultiUsers] = useState<UserData[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const createParticipant = useParticipantsStore(state => state.createParticipant);
  
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ParticipantFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
    }
  });

  // Buscar todos os usuários para o modo multi
  useEffect(() => {
    if (entryMethod === 'multi') {
      setMultiLoading(true);
      (async () => {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, phone, cpf');
        
        if (!usersError && usersData) {
          // Buscar participantes já inscritos no evento
          const { data: existingParticipants } = await supabase
            .from('participants')
            .select('user_id')
            .eq('event_id', eventId);
          
          const existingUserIds = new Set(existingParticipants?.map(p => p.user_id) || []);
          
          // Marcar usuários que já estão inscritos
          const usersWithStatus = usersData.map(user => ({
            ...user,
            isAlreadyRegistered: existingUserIds.has(user.id)
          }));
          
          setMultiUsers(usersWithStatus);
        }
        setMultiLoading(false);
      })();
    }
  }, [entryMethod, eventId]);

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

  const handleMultiToggle = (user: UserData) => {
    setMultiSelectedUsers((prev) => {
      if (prev.some(u => u.id === user.id)) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleMultiAdd = async () => {
    setIsSubmitting(true);
    try {
      const results = [];
      const errors = [];
      
      for (const user of multiSelectedUsers) {
        try {
          // Verificar se o usuário já está inscrito no evento
          const { data: existingParticipant } = await supabase
            .from('participants')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', eventId)
            .maybeSingle();
          
          if (existingParticipant) {
            errors.push(`${user.full_name} já está inscrito neste evento`);
            continue;
          }
          
          // Formatar e validar CPF
          const formattedCPF = formatCPF(user.cpf || '');
          
          if (formattedCPF && !isValidCPF(formattedCPF)) {
            errors.push(`${user.full_name}: CPF inválido (${user.cpf})`);
            continue;
          }
          
          await createParticipant({
            eventId,
            name: user.full_name || '',
            email: user.email || '',
            phone: user.phone || '',
            cpf: formattedCPF, // Usar CPF formatado
            userId: user.id
          });
          
          results.push(user.full_name);
        } catch (error) {
          console.error(`Erro ao adicionar ${user.full_name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          errors.push(`${user.full_name}: ${errorMessage}`);
        }
      }
      
      // Mostrar resultado da operação
      if (results.length > 0) {
        alert(`${results.length} participante(s) adicionado(s) com sucesso: ${results.join(', ')}`);
      }
      
      if (errors.length > 0) {
        alert(`Alguns participantes não puderam ser adicionados:\n${errors.join('\n')}`);
      }
      
      setMultiSelectedUsers([]);
      onSuccess();
    } catch (error) {
      alert(`Erro geral ao adicionar participantes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
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

  // Função para formatar CPF
  const formatCPF = (cpf: string): string => {
    if (!cpf) return '';
    
    // Remove tudo que não é número
    const numbers = cpf.replace(/\D/g, '');
    
    // Se não tem números suficientes, retorna vazio
    if (numbers.length !== 11) return '';
    
    // Formata como 000.000.000-00
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para validar CPF
  const isValidCPF = (cpf: string): boolean => {
    if (!cpf) return false;
    
    // Remove caracteres não numéricos
    const numbers = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (numbers.length !== 11) return false;
    
    // Verifica se não são todos iguais (111.111.111-11, etc.)
    if (/^(\d)\1{10}$/.test(numbers)) return false;
    
    return true;
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
        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${
            entryMethod === 'multi' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setEntryMethod('multi')}
        >
          <Users size={18} className="mr-2" />
          Seleção Múltipla
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

      {entryMethod === 'multi' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selecionar vários usuários
          </label>
          {multiLoading ? (
            <div className="text-center py-4">Carregando usuários...</div>
          ) : (
            <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
              {multiUsers.map(user => (
                <label 
                  key={user.id} 
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                    user.isAlreadyRegistered ? 'bg-gray-100 opacity-60' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mr-2 accent-brand-green"
                    checked={multiSelectedUsers.some(u => u.id === user.id)}
                    onChange={() => handleMultiToggle(user)}
                    disabled={user.isAlreadyRegistered}
                  />
                  <span className="flex-1">
                    <span className={`font-medium ${user.isAlreadyRegistered ? 'text-gray-500' : ''}`}>
                      {user.full_name}
                    </span>
                    <span className={`ml-2 text-xs ${user.isAlreadyRegistered ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user.email}
                    </span>
                    {user.isAlreadyRegistered && (
                      <span className="ml-2 text-xs text-orange-600 font-medium">
                        Já inscrito
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-3">
            <Button
              type="button"
              onClick={handleMultiAdd}
              loading={isSubmitting}
              disabled={multiSelectedUsers.length === 0}
            >
              Adicionar Selecionados ({multiSelectedUsers.length})
            </Button>
          </div>
        </div>
      )}
      
      {entryMethod !== 'multi' && (
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
      )}
    </div>
  );
};
