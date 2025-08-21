import { useEffect, useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Edit, 
  UserCheck,
  Bell,
  Trophy,
  Medal,
  Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useParticipant } from '../../hooks/useParticipant';
import { formatCPF, formatPhone, formatDate } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { PartnerInvites } from '../../components/PartnerInvites';

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  created_at: string;
}

interface UserStats {
  totalTournaments: number;
  totalWins: number;
  totalPodiums: number;
}

export const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvites, setShowInvites] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const { pendingInvites, fetchPendingInvites } = useParticipant();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // Buscar dados do perfil
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone, cpf, birth_date, created_at')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setProfile(data);

        // Buscar estatísticas do usuário
        const { count: totalTournaments } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Vitórias: placement = 1
        const { count: totalWins } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('final_position', 1);

        // Pódios: placement 1, 2 ou 3
        const { count: totalPodiums } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('final_position', [1, 2, 3]);

        setStats({
          totalTournaments: totalTournaments || 0,
          totalWins: totalWins || 0,
          totalPodiums: totalPodiums || 0,
        });

        // Buscar convites pendentes
        await fetchPendingInvites(user.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-blue"></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Não foi possível carregar os dados do perfil</p>
        <Button 
          variant="primary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-2">Gerencie seus dados e acompanhe suas estatísticas</p>
        </div>

        {/* Estatísticas do usuário */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Trophy size={32} className="text-yellow-600" />
                </div>
              </div>
              <span className="text-3xl font-bold text-gray-900 block">{stats.totalTournaments}</span>
              <span className="text-gray-600 text-sm font-medium">Torneios Participados</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Medal size={32} className="text-green-600" />
                </div>
              </div>
              <span className="text-3xl font-bold text-gray-900 block">{stats.totalWins}</span>
              <span className="text-gray-600 text-sm font-medium">Vitórias</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users size={32} className="text-blue-600" />
                </div>
              </div>
              <span className="text-3xl font-bold text-gray-900 block">{stats.totalPodiums}</span>
              <span className="text-gray-600 text-sm font-medium">Pódios</span>
            </div>
          </div>
        )}

        {/* Card de perfil */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-blue to-blue-600 px-6 py-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-xl">
                  <User size={40} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  <p className="text-blue-100">Membro desde {formatDate(profile.created_at)}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto"
              >
                <Edit size={16} className="mr-2" />
                Editar Perfil
              </Button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Informações pessoais */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Informações Pessoais
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <Mail size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{profile.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Phone size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Telefone</p>
                      <p className="font-medium text-gray-900">{formatPhone(profile.phone)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <UserCheck size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">CPF</p>
                      <p className="font-medium text-gray-900">{formatCPF(profile.cpf)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                      <Calendar size={16} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data de Nascimento</p>
                      <p className="font-medium text-gray-900">{formatDate(profile.birth_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Convites de parceiros */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Convites Pendentes</h3>
                  {pendingInvites.length > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      {pendingInvites.length} novo{pendingInvites.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {pendingInvites.length > 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
                    <div 
                      className="p-4 bg-yellow-100 border-b border-yellow-200 flex justify-between items-center cursor-pointer hover:bg-yellow-200 transition-colors"
                      onClick={() => setShowInvites(!showInvites)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-200 rounded-lg">
                          <Bell size={18} className="text-yellow-700" />
                        </div>
                        <div>
                          <p className="font-medium text-yellow-800">
                            {pendingInvites.length} convite{pendingInvites.length !== 1 ? 's' : ''} pendente{pendingInvites.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-yellow-700">
                            Clique para {showInvites ? 'ocultar' : 'visualizar'}
                          </p>
                        </div>
                      </div>
                      <span className="text-yellow-700 font-bold text-lg">
                        {showInvites ? '−' : '+'}
                      </span>
                    </div>
                    {showInvites && (
                      <div className="p-4">
                        <PartnerInvites 
                          onActionTaken={() => fetchPendingInvites(user!.id)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                    <div className="p-3 bg-gray-100 rounded-xl inline-block mb-3">
                      <Bell size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">Nenhum convite pendente</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Você está em dia com seus convites!
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center gap-2"
                    onClick={() => window.location.href = '/meus-torneios'}
                  >
                    <Trophy size={18} />
                    <span className="hidden sm:inline">Meus Torneios</span>
                    <span className="sm:hidden">Torneios</span>
                  </Button>
                  
                  <Button 
                    variant="primary" 
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-green-600"
                    onClick={() => window.location.href = '/eventos-disponiveis'}
                  >
                    <Calendar size={18} />
                    <span className="hidden sm:inline">Ver Eventos</span>
                    <span className="sm:hidden">Eventos</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
