import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { userService } from '../../services/userService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';

// Define validation schema for profile updates
const profileSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  bio: z.string().optional(),
  preferredCategories: z.array(z.string()).optional(),
  playingLevel: z.enum(['INICIANTE', 'INTERMEDIÁRIO', 'AVANÇADO', 'PROFISSIONAL']).optional()
});

type ProfileData = z.infer<typeof profileSchema>;

export const UserProfile: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    bio: '',
    preferredCategories: [],
    playingLevel: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Categories for beach tennis
  const availableCategories = [
    'PRO', 'A', 'B', 'C', 'D', 'E', 'AMADOR', 
    'MISTO', 'MASCULINO', 'FEMININO',
    '40+', '50+', '60+'
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const userData = await userService.getUserProfile(user.id);
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          birthDate: userData.birthDate ? new Date(userData.birthDate).toISOString().split('T')[0] : '',
          bio: userData.bio || '',
          preferredCategories: userData.preferredCategories || [],
          playingLevel: userData.playingLevel
        });
      } catch (error) {
        showToast({
          title: 'Erro',
          message: 'Não foi possível carregar seu perfil',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, showToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setProfileData(prev => {
      const updatedCategories = prev.preferredCategories || [];
      return {
        ...prev,
        preferredCategories: updatedCategories.includes(category)
          ? updatedCategories.filter(c => c !== category)
          : [...updatedCategories, category]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Validate form data
      const validatedData = profileSchema.parse(profileData);
      
      // Submit to backend
      await userService.updateUserProfile(user!.id, validatedData);
      
      showToast({
        title: 'Perfil atualizado',
        message: 'Suas informações foram atualizadas com sucesso!',
        type: 'success'
      });
      
      setIsEditing(false);
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
        // Handle backend errors
        showToast({
          title: 'Erro',
          message: 'Ocorreu um erro ao atualizar seu perfil. Por favor, tente novamente.',
          type: 'error'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="md" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Seu Perfil</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Editar Perfil
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
        )}
      </div>
      
      {!isEditing ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-700">Informações Pessoais</h3>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="text-base">{profileData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-base">{profileData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="text-base">{profileData.phone || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de Nascimento</p>
                <p className="text-base">
                  {profileData.birthDate ? new Date(profileData.birthDate).toLocaleDateString('pt-BR') : 'Não informada'}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-700">Sobre Você</h3>
            <p className="mt-2 text-base whitespace-pre-wrap">{profileData.bio || 'Nenhuma biografia adicionada'}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-700">Categorias Preferidas</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {profileData.preferredCategories && profileData.preferredCategories.length > 0 ? (
                profileData.preferredCategories.map(category => (
                  <span key={category} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {category}
                  </span>
                ))
              ) : (
                <p className="text-base text-gray-500">Nenhuma categoria selecionada</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-700">Nível de Jogo</h3>
            <p className="mt-2 text-base">{profileData.playingLevel || 'Não informado'}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">Informações Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email*
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  placeholder="(99) 99999-9999"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={profileData.birthDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Sobre Você
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={profileData.bio}
              onChange={handleChange}
              placeholder="Conte um pouco sobre você e sua experiência com beach tennis..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Categorias Preferidas
            </span>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    profileData.preferredCategories?.includes(category)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="playingLevel" className="block text-sm font-medium text-gray-700">
              Nível de Jogo
            </label>
            <select
              id="playingLevel"
              name="playingLevel"
              value={profileData.playingLevel}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione um nível</option>
              <option value="INICIANTE">Iniciante</option>
              <option value="INTERMEDIÁRIO">Intermediário</option>
              <option value="AVANÇADO">Avançado</option>
              <option value="PROFISSIONAL">Profissional</option>
            </select>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserProfile;
