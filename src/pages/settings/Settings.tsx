import React, { useState } from 'react';
import { 
  User, KeyRound, Bell, CreditCard, CircleDollarSign, Shield, 
  ChevronRight, Save, Check
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    // In a real app, this would save the form data
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        
        <div className="md:w-3/4 bg-white rounded-lg shadow border border-brand-gray">
          {activeTab === 'profile' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-brand-blue mb-6">Perfil do Administrador</h2>
              <form className="space-y-6">
                <div className="flex items-center">
                  <div className="h-20 w-20 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                    <User size={32} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Foto de perfil</p>
                    <Button variant="outline" className="mt-2">
                      Alterar foto
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Nome"
                    defaultValue="Administrador"
                  />
                  
                  <Input
                    label="Sobrenome"
                    defaultValue="Arena Conexão"
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    defaultValue="admin@arenaconexao.com.br"
                  />
                  
                  <Input
                    label="Telefone"
                    defaultValue="(11) 99999-9999"
                  />
                </div>
                
                <Button onClick={handleSave} className="mt-4">
                  {saved ? <Check size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                  {saved ? 'Salvo com sucesso!' : 'Salvar alterações'}
                </Button>
              </form>
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
