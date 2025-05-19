import React, { useState } from 'react';
import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { debugAuth } from '../lib/supabase';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting to sign in with:', email);
      await signIn(email, password);
      console.log('Sign in successful');
      
      // Debug auth state after login
      await debugAuth();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };return (
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

            {error && (
              <div className="text-sm text-brand-orange text-center">
                {error}
              </div>
            )}

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