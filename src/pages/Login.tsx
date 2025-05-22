import React, { useState } from 'react';
import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { debugAuth } from '../lib/supabase';
import { useNotificationStore } from '../components/ui/Notification';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const addNotification = useNotificationStore((state: { addNotification: (notification: any) => void }) => 
    state.addNotification
  );

  // Função para lidar com redirecionamento após login
  const handleRedirectAfterLogin = () => {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      // Limpar o item de redirecionamento
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      addNotification({
        type: 'error',
        message: 'Por favor, preencha todos os campos'
      });
      return;
    }
    
    try {
      setLoading(true);
      await signIn(email, password);
      
      addNotification({
        type: 'success',
        message: 'Login realizado com sucesso!'
      });
      
      // Usar o método de redirecionamento
      handleRedirectAfterLogin();
    } catch (error) {
      console.error('Error during login:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao fazer login'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-sand flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Award className="w-16 h-16 text-brand-green" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-blue">
          Arena Conexão
        </h2>
        <p className="mt-2 text-center text-sm text-brand-purple">
          Plataforma de Torneios de Beach Tênis
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-brand-gray">
          <h3 className="text-xl font-bold text-center mb-6 text-brand-blue">
            Login
          </h3>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              Entrar
            </Button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <button 
                  type="button"
                  onClick={() => navigate('/register')} 
                  className="font-medium text-brand-green hover:text-brand-blue transition-colors"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;