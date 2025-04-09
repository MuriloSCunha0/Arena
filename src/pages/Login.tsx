import React, { useState } from 'react';
import { Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signIn = useAuthStore((state) => state.signIn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err) {
      setError('Email ou senha inválidos');
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
          Arena Conexão Admin
        </h2>
        <p className="mt-2 text-center text-sm text-brand-purple">
          Plataforma de gerenciamento de torneios e bolões de Beach Tênis
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-brand-gray">
          <form className="space-y-6" onSubmit={handleSubmit}>
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
          </form>
        </div>
      </div>
    </div>
  );
};