import React, { useState, useEffect } from 'react';
import { 
  User, KeyRound, Bell, CreditCard, CircleDollarSign, Shield, 
  ChevronRight, Save, Check, Loader
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { UserProfileService, UserProfile } from '../../services/userProfileService';
import { formatCPF, formatPhone } from '../../utils/validation';
import { useNotificationStore } from '../../components/ui/Notification';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user } = useAuthStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userProfile = await UserProfileService.getByUserId(user.id);
        setProfile(userProfile);
        
        // Set form fields
        if (userProfile) {
          setFullName(userProfile.full_name || '');
          setPhone(userProfile.phone ? formatPhone(userProfile.phone) : '');
          setCpf(userProfile.cpf ? formatCPF(userProfile.cpf) : '');
          setBirthDate(userProfile.birth_date || '');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar perfil do usuário'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user, addNotification]);
  
  const handleSave = async () => {
    if (!user) return;
    
    try {
      // Format data
      const profileData = {
        full_name: fullName,
        phone: phone.replace(/\D/g, ''),
        cpf: cpf.replace(/\D/g, ''),
        birth_date: birthDate
      };
      
      await UserProfileService.upsert(user.id, profileData);
      
      setSaved(true);
      addNotification({
        type: 'success',
        message: 'Perfil atualizado com sucesso!'
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao salvar perfil'
      });
    }
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };
  
  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'payment', label: 'Métodos de Pagamento', icon: CreditCard },
    { id: 'pix', label: 'Configuração de Pix', icon: CircleDollarSign },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Configurações</h1>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow border border-brand-gray overflow-hidden">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`
                  flex items-center justify-between w-full p-4 text-left
                  ${activeTab === tab.id 
                    ? 'bg-brand-green/10 border-l-4 border-brand-green' 
                    : 'hover:bg-gray-50 border-l-4 border-transparent'}
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="flex items-center">
                  <tab.icon 
                    size={18} 
                    className={activeTab === tab.id ? 'text-brand-green' : 'text-gray-500'} 
                  />
                  <span 
                    className={`ml-3 font-medium ${
                      activeTab === tab.id ? 'text-brand-blue' : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
                <ChevronRight 
                  size={16} 
                  className={activeTab === tab.id ? 'text-brand-green' : 'text-gray-300'} 
                />
              </button>
            ))}
          </div>
        </div>
        
        <div className="md:w-3/4 bg-white rounded-lg shadow border border-brand-gray">          {activeTab === 'profile' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-brand-blue mb-6">Perfil do Usuário</h2>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader size={24} className="animate-spin text-brand-green" />
                </div>
              ) : (
                <form className="space-y-6">
                  <div className="flex items-center">
                    <div className="h-20 w-20 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple overflow-hidden">
                      {profile?.photo_url ? (
                        <img 
                          src={profile.photo_url} 
                          alt={profile.full_name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={32} />
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">Foto de perfil</p>
                      <Button variant="outline" className="mt-2" onClick={() => window.location.href = '/perfil'}>
                        Gerenciar foto
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                      <Input
                      label="Email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1 ml-1">O email não pode ser alterado</p>
                    
                    <Input
                      label="Telefone"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                    
                    <Input
                      label="CPF"
                      value={cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    
                    <Input
                      label="Data de nascimento"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  
                  <Button onClick={handleSave} className="mt-4">
                    {saved ? <Check size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                    {saved ? 'Salvo com sucesso!' : 'Salvar alterações'}
                  </Button>
                  
                  <p className="text-sm text-gray-500 mt-2">
                    Visite seu <a href="/perfil" className="text-brand-green hover:underline">perfil completo</a> para ver seu histórico de torneios e mais informações.
                  </p>
                </form>
              )}
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-brand-blue mb-6">Segurança</h2>
              <form className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700 flex items-center">
                    <KeyRound size={18} className="mr-2 text-brand-purple" />
                    Alterar Senha
                  </h3>
                  
                  <Input
                    label="Senha Atual"
                    type="password"
                  />
                  
                  <Input
                    label="Nova Senha"
                    type="password"
                  />
                  
                  <Input
                    label="Confirmar Nova Senha"
                    type="password"
                  />
                </div>
                
                <Button onClick={handleSave} className="mt-4">
                  {saved ? <Check size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                  {saved ? 'Senha alterada com sucesso!' : 'Alterar Senha'}
                </Button>
              </form>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-brand-blue mb-6">Configurações de Notificações</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-brand-blue">Novas inscrições</h3>
                    <p className="text-sm text-gray-500">Receber notificações quando novas inscrições forem feitas</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-brand-blue">Confirmações de pagamento</h3>
                    <p className="text-sm text-gray-500">Receber notificações quando pagamentos forem confirmados</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-brand-blue">Resumo diário</h3>
                    <p className="text-sm text-gray-500">Receber um resumo diário das atividades</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                  </label>
                </div>
              </div>
              
              <Button onClick={handleSave} className="mt-6">
                {saved ? <Check size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                {saved ? 'Configurações salvas!' : 'Salvar configurações'}
              </Button>
            </div>
          )}
          
          {activeTab === 'payment' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-brand-blue mb-6">Métodos de Pagamento</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CreditCard size={20} className="text-brand-purple mr-3" />
                    <div>
                      <h3 className="font-medium text-brand-blue">Pagamentos via PIX</h3>
                      <p className="text-sm text-gray-500">Ativar pagamentos via PIX para inscrições</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CreditCard size={20} className="text-brand-purple mr-3" />
                    <div>
                      <h3 className="font-medium text-brand-blue">Pagamentos via Cartão</h3>
                      <p className="text-sm text-gray-500">Ativar pagamentos com cartão para inscrições</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                  </label>
                </div>
              </div>
              
              <Button onClick={handleSave} className="mt-6">
                {saved ? <Check size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                {saved ? 'Configurações salvas!' : 'Salvar configurações'}
              </Button>
            </div>
          )}
          
          {activeTab === 'pix' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-brand-blue mb-6">Configuração de PIX</h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input
                      label="Nome de Exibição para Pagamento"
                      defaultValue="Arena Conexão Beach Tênis"
                    />
                  </div>
                  
                  <Input
                    label="Tipo de Chave PIX"
                    defaultValue="CNPJ"
                  />
                  
                  <Input
                    label="Chave PIX"
                    defaultValue="12.345.678/0001-90"
                  />
                </div>
                
                <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                  <p className="text-sm">
                    <strong>Importante:</strong> As alterações nas configurações do PIX afetarão todos os futuros pagamentos. 
                    Verifique se as informações estão corretas.
                  </p>
                </div>
                
                <Button onClick={handleSave} className="mt-4">
                  {saved ? <Check size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                  {saved ? 'Configurações salvas!' : 'Salvar configurações'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
