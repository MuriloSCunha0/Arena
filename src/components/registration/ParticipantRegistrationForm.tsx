import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { GuaranteedRegistrationService } from '../../services/guaranteedRegistrationService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

// Define Zod schema for form validation
const registrationSchema = z.object({
  partnerName: z.string().optional(),
  phoneNumber: z.string().min(10, 'Número de telefone deve ter pelo menos 10 dígitos'),
  category: z.string().optional(),
  paymentMethod: z.enum(['pix', 'credit_card', 'cash', 'bank_transfer']),
  notes: z.string().optional()
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface ParticipantRegistrationFormProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventPrice: number;
  isTeamEvent?: boolean;
  onSuccess: (registrationId: string) => void;
  onError: (message: string) => void;
}

export const ParticipantRegistrationForm = ({
  eventId,
  eventTitle,
  eventDate,
  eventPrice,
  isTeamEvent = false,
  onSuccess,
  onError
}: ParticipantRegistrationFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      paymentMethod: 'pix'
    }
  });
  
  const onSubmit = async (data: RegistrationFormData) => {
    if (!user) {
      onError('Você precisa estar logado para se inscrever neste evento');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🚨 [ParticipantRegistrationForm] INICIANDO INSCRIÇÃO GARANTIDA');
      
      // ✅ USAR SERVIÇO GARANTIDO que SEMPRE salva na tabela participants
      const result = await GuaranteedRegistrationService.guaranteeParticipantSaved(
        user.id,
        eventId,
        {
          name: user.full_name || user.email || 'Nome não informado',
          email: user.email,
          phone: data.phoneNumber,
          cpf: '', // Será coletado posteriormente se necessário
          partnerName: data.partnerName,
          category: data.category,
          paymentMethod: data.paymentMethod as any,
          notes: data.notes
        }
      );
      
      if (result.success) {
        console.log('✅ [ParticipantRegistrationForm] SUCESSO - Participante salvo:', result.participant);
        onSuccess(result.participantId);
      } else {
        console.error('❌ [ParticipantRegistrationForm] Falha na inscrição');
        onError('Erro ao processar inscrição. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('❌ [ParticipantRegistrationForm] Erro crítico:', error);
      onError(error instanceof Error ? error.message : 'Erro ao processar inscrição');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-brand-gray">
      <h2 className="text-xl font-semibold text-brand-blue mb-4">
        Inscrição para: {eventTitle}
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isTeamEvent && (
          <Input
            label="Nome do parceiro(a)"
            placeholder="Digite o nome completo do seu parceiro(a)"
            error={errors.partnerName?.message}
            {...register('partnerName')}
          />
        )}
        
        <Input
          label="Telefone para contato"
          placeholder="(00) 00000-0000"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
          <Select
          label="Categoria"
          error={!!errors.category}
          errorMessage={errors.category?.message}
          {...register('category')}
        >
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
          <option value="profissional">Profissional</option>
        </Select>
        
        <Select
          label="Forma de pagamento"
          error={!!errors.paymentMethod}
          errorMessage={errors.paymentMethod?.message}
          {...register('paymentMethod')}
        >
          <option value="pix">PIX</option>
          <option value="credit_card">Cartão de Crédito</option>
          <option value="bank_transfer">Transferência Bancária</option>
          <option value="cash">Dinheiro (no local)</option>
        </Select>
        
        <Input
          label="Observações (opcional)"
          placeholder="Alguma informação adicional que precisamos saber?"
          error={errors.notes?.message}
          {...register('notes')}
          textarea
        />
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="font-medium text-brand-blue">Valor da inscrição:</p>
          <p className="text-2xl font-bold text-brand-green">
            {eventPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        
        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          Confirmar Inscrição
        </Button>
      </form>
    </div>
  );
};
