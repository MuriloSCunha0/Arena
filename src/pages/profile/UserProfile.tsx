import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Edit, 
  UserCheck,
  Bell,
  ClipboardList
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

export const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvites, setShowInvites] = useState(false);
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
        
        // Buscar convites pendentes
        await fetchPendingInvites(user.id);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user, fetchPendingInvites]);
  
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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h1>
      
      {/* Card de perfil */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="bg-brand-blue/10 p-4 rounded-full mr-4">
              <User size={40} className="text-brand-blue" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.full_name}</h2>
              <p className="text-gray-500">Membro desde {formatDate(profile.created_at)}</p>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="flex items-center">
            <Edit size={16} className="mr-1" />
            Editar
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Informações pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Informações pessoais</h3>
            
            <div className="flex items-center text-gray-600">
              <Mail className="w-5 h-5 mr-2 text-brand-blue/70" />
              <p>{profile.email}</p>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Phone className="w-5 h-5 mr-2 text-brand-blue/70" />
              <p>{formatPhone(profile.phone)}</p>
            </div>
            
            <div className="flex items-center text-gray-600">
              <UserCheck className="w-5 h-5 mr-2 text-brand-blue/70" />
              <p>{formatCPF(profile.cpf)}</p>
            </div>
            
            <div className="flex items-center text-gray-600">
              <Calendar className="w-5 h-5 mr-2 text-brand-blue/70" />
              <p>{formatDate(profile.birth_date)}</p>
            </div>
          </div>
          
          {/* Convites de parceiros */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Convites pendentes</h3>
              {pendingInvites.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {pendingInvites.length}
                </span>
              )}
            </div>
            
            {pendingInvites.length > 0 ? (
              <div className="border rounded-md">
                <div 
                  className="p-3 border-b bg-gray-50 flex justify-between cursor-pointer"
                  onClick={() => setShowInvites(!showInvites)}
                >
                  <div className="flex items-center">
                    <Bell size={18} className="mr-2 text-brand-blue" />
                    <span>
                      Você tem {pendingInvites.length} {pendingInvites.length === 1 ? 'convite' : 'convites'} pendente{pendingInvites.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span>{showInvites ? '▲' : '▼'}</span>
                </div>
                
                {showInvites && (
                  <div className="p-2">
                    <PartnerInvites 
                      onActionTaken={() => fetchPendingInvites(user!.id)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border rounded-md text-center text-gray-500 bg-gray-50">
                <Bell size={24} className="mx-auto mb-1 text-gray-400" />
                <p>Sem convites pendentes</p>
              </div>
            )}
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center"
                onClick={() => window.location.href = '/meus-torneios'}
              >
                <ClipboardList size={18} className="mr-2" />
                Ver meus torneios
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
