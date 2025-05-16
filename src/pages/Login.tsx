import React, { useState } from 'react';
import { Award, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { validateCPF, formatCPF, formatPhone } from '../utils/validation';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setCpf('');
    setBirthDate('');
    setError('');
    setSuccess('');
  };

  const handleToggleMode = () => {
    resetForm();
    setIsLogin(!isLogin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        // Validações para o registro
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }
        
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
        
        if (!validateCPF(cpf)) {
          throw new Error('CPF inválido');
        }
        
        // Preparar dados do usuário para o cadastro
        const userData = {
          full_name: fullName,
          phone: phone.replace(/[^\d]/g, ''), // Remove formatação
          cpf: cpf.replace(/[^\d]/g, ''), // Remove formatação
          birth_date: birthDate
        };
        
        await signUp(email, password, userData);
        setSuccess('Cadastro realizado com sucesso! Verifique seu email para confirmar o cadastro.');
        setTimeout(() => {
          setIsLogin(true);
          resetForm();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Email ou senha inválidos' : 'Erro ao cadastrar'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhone(e.target.value);
    setPhone(formattedPhone);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCpf = formatCPF(e.target.value);
    setCpf(formattedCpf);
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
          {!isLogin && (
            <button 
              onClick={handleToggleMode}
              className="flex items-center text-brand-blue mb-6 hover:text-brand-green transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar para login
            </button>
          )}
          
          <h3 className="text-xl font-bold text-center mb-6 text-brand-blue">
            {isLogin ? 'Login' : 'Cadastre-se'}
          </h3>
          
          {success && (
            <div className="mb-4 p-2 bg-green-50 border border-green-200 text-green-700 rounded">
              {success}
            </div>
          )}
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <Input
                label="Nome completo"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            
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
            
            {!isLogin && (
              <>
                <Input
                  label="Confirmar senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <Input
                  label="CPF"
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                
                <Input
                  label="Telefone"
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                
                <Input
                  label="Data de nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </>
            )}

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
              {isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
            
            {isLogin && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Não tem uma conta?{' '}
                  <button 
                    type="button"
                    onClick={handleToggleMode} 
                    className="font-medium text-brand-green hover:text-brand-blue transition-colors"
                  >
                    Cadastre-se
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};