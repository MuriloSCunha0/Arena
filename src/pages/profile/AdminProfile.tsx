import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Settings, Users, LogOut,
  Loader
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

export const AdminProfile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<any>(null);

  useEffect(() => {
    const loadAdminData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Get basic admin information from auth
        const { data } = await supabase.auth.getUser();
        
        if (data.user) {
          setAdminData({
            id: data.user.id,
            name: data.user.user_metadata?.name || 'Administrador',
            email: data.user.email,
            createdAt: new Date(data.user.created_at).toLocaleDateString('pt-BR')
          });
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAdminData();
  }, [user]);

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
        <h1 className="text-2xl font-bold text-brand-blue">Painel de Administração</h1>
      </div>

      {/* Admin Profile Header */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex items-center space-x-6">
          <div className="h-24 w-24 rounded-full bg-brand-purple/20 flex items-center justify-center">
            <Shield className="h-12 w-12 text-brand-purple" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-blue">{adminData?.name}</h2>
            <p className="text-gray-600">{adminData?.email}</p>
            <div className="mt-1 flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-purple/20 text-brand-purple">
                Administrador
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Conta criada em: {adminData?.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <h2 className="text-lg font-semibold text-brand-blue mb-4">Ações Rápidas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="p-6 h-auto flex flex-col items-center space-y-2"
            onClick={() => navigate('/admin/usuarios')}
          >
            <Users className="h-8 w-8 text-brand-green" />
            <span>Gerenciar Usuários</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="p-6 h-auto flex flex-col items-center space-y-2"
            onClick={() => navigate('/admin/configuracoes')}
          >
            <Settings className="h-8 w-8 text-brand-blue" />
            <span>Configurações do Sistema</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="p-6 h-auto flex flex-col items-center space-y-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-8 w-8 text-brand-orange" />
            <span>Sair</span>
          </Button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <h2 className="text-lg font-semibold text-brand-blue mb-4">Informações do Sistema</h2>
        
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Plataforma:</span>
            <span className="font-medium">Arena Conexão</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Versão:</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium text-green-600">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
