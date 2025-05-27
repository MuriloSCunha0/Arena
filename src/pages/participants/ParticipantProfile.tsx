import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Trophy,
  MapPin,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { ParticipanteService, ParticipanteProfileWithStats } from '../../services/participanteService';
import { formatPhone, formatDate } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../components/ui/Notification';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export const ParticipantProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [profile, setProfile] = useState<ParticipanteProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Verificar se o usuário é um administrador
  useEffect(() => {
    if (!user || !isAdmin()) {
      addNotification({
        type: 'error',
        message: 'Você não tem permissão para acessar esta página'
      });
      navigate('/login');
      return;
    }
  }, [user, isAdmin, navigate, addNotification]);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        
        // Primeiro tente buscar pelos dados de participante na tabela participants
        const { data: participantData, error: participantError } = await supabase
          .from('participants')
          .select(`
            *,
            events(title, date, location)
          `)
          .eq('user_id', id)
          .maybeSingle();

        if (participantData && !participantError) {
          setProfile(participantData);
        } else {
          // Se não encontrar como participante, busque na tabela users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (userData && !userError) {
            setProfile(userData);
          } else {
            console.error('Erro ao buscar dados do participante:', userError || participantError);
            addNotification({
              type: 'error',
              message: 'Não foi possível carregar os dados do participante'
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar perfil do participante:', error);
        addNotification({
          type: 'error',
          message: 'Não foi possível carregar os dados do participante'
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user && isAdmin()) {
      fetchProfile();
    }
  }, [id, addNotification, user, isAdmin]);
  
  const handleGoBack = () => {
    navigate('/participantes');
  };
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 size={32} className="animate-spin text-brand-blue" />
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Participante não encontrado</p>
        <Button 
          variant="primary"
          className="mt-4"
          onClick={handleGoBack}
        >
          Voltar para Lista de Participantes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <Button
          variant="outline"
          className="flex items-center"
          onClick={handleGoBack}
        >
          <ArrowLeft size={16} className="mr-1" />
          Voltar para Lista de Participantes
        </Button>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Perfil do Participante</h1>
      
      {/* Card de perfil */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="bg-brand-blue/10 p-4 rounded-full mr-4">
              <User size={40} className="text-brand-blue" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.full_name}</h2>
              <p className="text-gray-500">Membro desde {formatDate(profile.created_at || '')}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Informações do participante */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Informações do participante</h3>
            
            <div className="flex items-center text-gray-600">
              <Mail className="w-5 h-5 mr-2 text-brand-blue/70" />
              <p>{profile.email}</p>
            </div>
            
            {profile.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="w-5 h-5 mr-2 text-brand-blue/70" />
                <p>{formatPhone(profile.phone)}</p>
              </div>
            )}
            
            {profile.birth_date && (
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-brand-blue/70" />
                <p>{formatDate(profile.birth_date)}</p>
              </div>
            )}
          </div>
          
          {/* Estatísticas */}
          <div>
            <h3 className="text-lg font-medium mb-2">Estatísticas</h3>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total de participações</span>
                  <span className="font-semibold">{profile.totalParticipations || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Histórico de torneios */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium mb-4">Histórico de Torneios</h3>
        
        {profile.pastEvents && profile.pastEvents.length > 0 ? (
          <div className="space-y-4">
            {profile.pastEvents.map((tournament) => (
              <div key={tournament.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-brand-blue">{tournament.title}</h4>
                
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(tournament.date)}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{tournament.location}</span>
                  </div>
                  
                  {tournament.teamPartner && (
                    <div className="flex items-center text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>Parceiro: {tournament.teamPartner}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span>Colocação: {tournament.placement}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Trophy size={32} className="mx-auto mb-2 opacity-30" />
            <p>Este participante ainda não participou de nenhum torneio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantProfile;
