import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Calendar, Trophy, Upload, Camera, Edit, CheckCircle,
  MapPin, DollarSign, ArrowRight, Loader
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { UserProfileService, UserProfileWithStats } from '../../services/userProfileService';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';
import { useNotificationStore } from '../../components/ui/Notification';

export const UserProfile = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [profile, setProfile] = useState<UserProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userRole, setUserRole] = useState<string>('USER');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const profileData = await UserProfileService.getProfileWithStats(user.id);
        setProfile(profileData);
        
        // Load user role
        const role = await UserProfileService.checkUserRole(user.id);
        setUserRole(role);
      } catch (error) {
        console.error('Error loading profile:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar perfil de usuário'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user, addNotification]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handlePhotoUpload = async () => {
    if (!user || !photoFile) return;
    
    try {
      setUploadingPhoto(true);
      const photoUrl = await UserProfileService.uploadProfilePhoto(user.id, photoFile);
      
      // Update local state
      setProfile(prev => prev ? { ...prev, photo_url: photoUrl } : null);
      setPhotoFile(null);
      
      addNotification({
        type: 'success',
        message: 'Foto de perfil atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao fazer upload da foto'
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const navigateToEditProfile = () => {
    navigate('/configuracoes');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Meu Perfil</h1>
        <Button onClick={navigateToEditProfile}>
          <Edit size={16} className="mr-2" />
          Editar Perfil
        </Button>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Profile Photo */}
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-brand-purple/10 overflow-hidden flex items-center justify-center text-brand-purple">
              {profile?.photo_url ? (
                <img 
                  src={profile.photo_url} 
                  alt={profile?.full_name || 'Profile'} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={48} />
              )}
            </div>
            <label 
              htmlFor="photo-upload" 
              className="absolute -right-2 bottom-0 bg-brand-green text-white rounded-full p-2 cursor-pointer hover:bg-brand-green/90 transition-colors"
            >
              <Camera size={16} />
            </label>
            <input 
              id="photo-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handlePhotoChange}
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-brand-blue">{profile?.full_name || user?.email}</h2>
            
            <div className="mt-2 space-y-1 text-gray-600">
              <p>{user?.email}</p>
              <p>{profile?.phone ? `Telefone: ${profile.phone}` : ''}</p>
              <p>{profile?.birth_date ? `Data de Nascimento: ${formatDate(profile.birth_date)}` : ''}</p>
            </div>
            
            {/* Role Badge */}
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${userRole === 'ADMIN' ? 'bg-brand-purple/20 text-brand-purple' :
                  userRole === 'ORGANIZER' ? 'bg-brand-green/20 text-brand-green' :
                  userRole === 'ASSISTANT' ? 'bg-brand-blue/20 text-brand-blue' :
                  'bg-gray-200 text-gray-700'}`}
              >
                {userRole === 'ADMIN' ? 'Administrador' :
                 userRole === 'ORGANIZER' ? 'Organizador' :
                 userRole === 'ASSISTANT' ? 'Assistente' : 'Usuário'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-brand-sand/40 rounded-lg p-4 md:self-stretch min-w-[200px]">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total de Participações</p>
              <p className="text-3xl font-semibold text-brand-purple">{profile?.totalParticipations || 0}</p>
            </div>
          </div>
        </div>

        {/* Photo Upload Button */}
        {photoFile && (
          <div className="mt-4 flex justify-center md:justify-start">
            <Button onClick={handlePhotoUpload} loading={uploadingPhoto}>
              <Upload size={16} className="mr-2" />
              {uploadingPhoto ? 'Enviando...' : 'Enviar Nova Foto'}
            </Button>
          </div>
        )}
      </div>

      {/* Upcoming Tournaments Section */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-blue flex items-center">
            <Calendar className="mr-2 text-brand-green" size={20} />
            Próximos Torneios
          </h2>
        </div>

        {profile?.upcomingEvents && profile.upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.upcomingEvents.map(event => (
              <div key={event.id} className="border border-brand-gray rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-brand-sand flex items-center justify-center overflow-hidden">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <Trophy size={32} className="text-brand-purple opacity-30" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-brand-blue">{event.title}</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-1 text-brand-green" />
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={14} className="mr-1 text-brand-green" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign size={14} className="mr-1 text-brand-green" />
                      R$ {event.price?.toFixed(2).replace('.', ',') || '0,00'}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={() => navigate(`/inscricao/${event.id}`)}
                  >
                    Inscrever-se
                    <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Não há torneios próximos disponíveis no momento.</p>
          </div>
        )}
      </div>

      {/* Tournament History Section */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex items-center mb-4">
          <Trophy className="mr-2 text-brand-purple" size={20} />
          <h2 className="text-lg font-semibold text-brand-blue">Histórico de Torneios</h2>
        </div>

        {profile?.pastEvents && profile.pastEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-gray">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Torneio</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Local</th>
                  <th className="px-6 py-3">Parceiro</th>
                  <th className="px-6 py-3">Colocação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray">
                {profile.pastEvents.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-brand-blue">{event.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(event.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {event.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {event.teamPartner || 'Individual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeof event.placement === 'number' && event.placement <= 3 ? (
                        <div className={`flex items-center font-medium
                          ${event.placement === 1 ? 'text-yellow-600' : 
                           event.placement === 2 ? 'text-gray-500' : 
                           event.placement === 3 ? 'text-amber-700' : 'text-gray-600'}`}
                        >
                          <Trophy size={16} className="mr-1" />
                          {event.placement}º Lugar
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {event.placement?.toString() || 'Participou'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Você ainda não participou de nenhum torneio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
