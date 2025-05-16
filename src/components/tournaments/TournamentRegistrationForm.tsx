import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

// Validation schema for tournament registration
const registrationSchema = z.object({
  tournamentId: z.string(),
  categoryId: z.string(),
  partnerId: z.string().optional(),
  paymentMethod: z.enum(['PIX', 'CREDITO', 'BOLETO', 'DINHEIRO']),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Você precisa aceitar os termos para continuar'
  })
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface Category {
  id: string;
  name: string;
  price: number;
  isTeam: boolean;
  description?: string;
}

interface TournamentRegistrationFormProps {
  tournamentId: string;
  categories: Category[];
  onRegister: (data: any) => Promise<void>;
  isLoading?: boolean;
}

const TournamentRegistrationForm: React.FC<TournamentRegistrationFormProps> = ({
  tournamentId,
  categories,
  onRegister,
  isLoading: externalLoading
}) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    tournamentId,
    categoryId: '',
    partnerId: '',
    paymentMethod: 'PIX',
    acceptTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [potentialPartners, setPotentialPartners] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const { userData } = useAuth();
  const { showToast } = useToast();

  // Update selected category when categoryId changes
  useEffect(() => {
    if (formData.categoryId) {
      const category = categories.find(c => c.id === formData.categoryId);
      setSelectedCategory(category || null);
    } else {
      setSelectedCategory(null);
    }
  }, [formData.categoryId, categories]);

  // Function to search for potential partners
  const searchPartners = async (term: string) => {
    if (!term || term.length < 3) {
      setPotentialPartners([]);
      return;
    }

    try {
      // This would be replaced with an actual API call
      // For now, we'll use mock data
      const mockPartners = [
        { id: 'user1', name: 'João Silva', playingLevel: 'AVANÇADO' },
        { id: 'user2', name: 'Maria Oliveira', playingLevel: 'INTERMEDIÁRIO' },
        { id: 'user3', name: 'Carlos Pereira', playingLevel: 'PROFISSIONAL' }
      ];
      
      // Filter by search term
      const filtered = mockPartners.filter(p => 
        p.name.toLowerCase().includes(term.toLowerCase())
      );
      
      setPotentialPartners(filtered);
    } catch (error) {
      console.error('Error searching partners:', error);
      setPotentialPartners([]);
    }
  };

  // Handle partner search input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPartners(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear any error when field is updated
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const selectPartner = (partner: any) => {
    setFormData(prev => ({
      ...prev,
      partnerId: partner.id
    }));
    setSearchTerm(partner.name);
    setPotentialPartners([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = registrationSchema.parse(formData);
      
      setIsLoading(true);
      
      // Check if partner is required for the selected category
      if (selectedCategory?.isTeam && !validatedData.partnerId) {
        setErrors({
          partnerId: 'Um parceiro é obrigatório para esta categoria'
        });
        return;
      }
      
      // Submit registration
      await onRegister({
        ...validatedData,
        userId: userData?.id
      });
      
      showToast({
        title: 'Inscrição realizada',
        message: 'Sua inscrição foi realizada com sucesso!',
        type: 'success'
      });
      
      // Reset form
      setFormData({
        tournamentId,
        categoryId: '',
        partnerId: '',
        paymentMethod: 'PIX',
        acceptTerms: false
      });
      setSearchTerm('');
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod errors into a simpler format
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        // Handle other errors
        showToast({
          title: 'Erro',
          message: 'Ocorreu um erro ao realizar a inscrição',
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormLoading = isLoading || externalLoading;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Inscrição para o Torneio</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
            Categoria*
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md ${errors.categoryId ? 'border-red-500' : 'border-gray-300'}`}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name} - R$ {category.price.toFixed(2)}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
          )}
        </div>
        
        {selectedCategory?.isTeam && (
          <div>
            <label htmlFor="partnerId" className="block text-sm font-medium text-gray-700 mb-1">
              Parceiro*
            </label>
            <div className="relative">
              <input
                type="text"
                id="partnerSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar parceiro por nome"
                className={`w-full p-2 border rounded-md ${errors.partnerId ? 'border-red-500' : 'border-gray-300'}`}
              />
              
              {/* Partner search results dropdown */}
              {potentialPartners.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {potentialPartners.map(partner => (
                    <div
                      key={partner.id}
                      onClick={() => selectPartner(partner)}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="font-medium">{partner.name}</div>
                      <div className="text-sm text-gray-500">Nível: {partner.playingLevel}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {searchTerm.length >= 3 && potentialPartners.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2">
                  <p className="text-gray-500">Nenhum jogador encontrado</p>
                </div>
              )}
            </div>
            
            {errors.partnerId && (
              <p className="mt-1 text-sm text-red-600">{errors.partnerId}</p>
            )}
            
            <input
              type="hidden"
              name="partnerId"
              value={formData.partnerId}
            />
          </div>
        )}
        
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
            Forma de Pagamento*
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md ${errors.paymentMethod ? 'border-red-500' : 'border-gray-300'}`}
            required
          >
            <option value="PIX">PIX</option>
            <option value="CREDITO">Cartão de Crédito</option>
            <option value="BOLETO">Boleto Bancário</option>
            <option value="DINHEIRO">Dinheiro (no local)</option>
          </select>
          {errors.paymentMethod && (
            <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
          )}
        </div>
        
        {selectedCategory && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-800">Resumo da Inscrição</h3>
            <div className="mt-2">
              <div className="flex justify-between">
                <span>Categoria:</span>
                <span>{selectedCategory.name}</span>
              </div>
              {selectedCategory.description && (
                <div className="mt-1 text-sm text-gray-600">
                  {selectedCategory.description}
                </div>
              )}
              <div className="flex justify-between mt-2 font-bold">
                <span>Valor:</span>
                <span>R$ {selectedCategory.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-start mt-4">
          <div className="flex items-center h-5">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${errors.acceptTerms ? 'border-red-500' : ''}`}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="acceptTerms" className="font-medium text-gray-700">
              Aceito os termos e condições
            </label>
            <p className="text-gray-500">
              Ao aceitar, você concorda com o regulamento do torneio e políticas de cancelamento.
            </p>
            {errors.acceptTerms && (
              <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
            )}
          </div>
        </div>
        
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isFormLoading}
            variant="primary"
          >
            {isFormLoading ? (
              <span className="flex items-center justify-center">
                <Spinner size="sm" className="mr-2" />
                Processando...
              </span>
            ) : (
              'Confirmar Inscrição'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TournamentRegistrationForm;
