import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ArrowLeft, User, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { validateCPF, formatCPF, formatPhone } from '../utils/validation';
import { useAuthStore, UserRole } from '../store/authStore';
import { traduzirErroSupabase } from '../lib/supabase';

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('participante');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdminOption, setShowAdminOption] = useState(false);
  
  // Use store methods for registration functionality
  const signUp = useAuthStore((state) => state.signUp);
  const navigate = useNavigate();
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setCpf('');
    setBirthDate('');
    setUserRole('participante');
    setError('');
    setSuccess('');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validações para o registro
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }
      
      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }
      
      // Validar CPF apenas para participantes
      if (!validateCPF(cpf) && userRole === 'participante') {
        throw new Error('CPF inválido');
      }
      
      console.log(`Attempting to register with role: ${userRole}`);
      
      // Preparar dados do usuário para o cadastro
      const userData = {
        full_name: fullName,
        phone: userRole === 'admin' ? null : formatPhone(phone),
        cpf: userRole === 'admin' ? null : formatCPF(cpf),
        birth_date: userRole === 'admin' ? null : birthDate
      };
      
      await signUp(email, password, userData, userRole);
      setSuccess(`Cadastro realizado com sucesso como ${userRole === 'admin' ? 'Administrador' : 'Participante'}! Verifique seu email para confirmar o cadastro.`);
      
      // Add a small delay before redirect to ensure state updates
      setTimeout(() => {
        navigate('/login');
        resetForm();
      }, 3000);    } catch (err: any) {
      console.error('Registration error:', err);
      setError(traduzirErroSupabase(err) || 'Erro ao cadastrar');
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
          <div className="w-16 h-16 bg-gradient-to-br from-brand-green to-brand-green-light rounded-xl flex items-center justify-center shadow-lg">
            <Award className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-blue">
          Arena Conexão
        </h2>
        <p className="mt-2 text-center text-description">
          Plataforma de gerenciamento de torneios e bolões de Beach Tênis
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-base p-8">
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center text-brand-blue mb-6 hover:text-brand-green transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para login
          </button>
          
          <h3 className="heading-section text-center mb-6">
            Cadastre-se
          </h3>
          
          {success && (
            <div className="mb-4 p-3 state-success rounded-xl border">
              {success}
            </div>
          )}
          
          <form className="section-spacing" onSubmit={handleSubmit}>
            <Input
              label="Nome completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            
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
            
            <Input
              label="Confirmar senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* Opção para mostrar seleção de admin (apenas para desenvolvimento) */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAdminOption(!showAdminOption)}
                className="text-xs text-gray-500 hover:text-brand-green transition-colors"
              >
                {showAdminOption ? 'Ocultar opções de admin' : 'Opções avançadas'}
              </button>
            </div>

            {showAdminOption && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-brand-blue">Tipo de usuário:</p>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={userRole === 'participante'}
                      onChange={() => setUserRole('participante')}
                      className="h-4 w-4 text-brand-green"
                    />
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1 text-brand-blue" />
                      <span className="text-sm">Participante</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={userRole === 'admin'}
                      onChange={() => setUserRole('admin')}
                      className="h-4 w-4 text-brand-green"
                    />
                    <span className="flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1 text-brand-orange" />
                      <span className="text-sm">Administrador</span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {userRole === 'participante' && (
              <>
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
              <div className="p-3 state-error rounded-xl border">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
            >
              Cadastrar
            </Button>
            
            <div className="text-center">
              <p className="text-description">
                Já tem uma conta?{' '}
                <button 
                  type="button"
                  onClick={() => navigate('/login')} 
                  className="font-medium text-brand-green hover:text-brand-blue transition-colors"
                >
                  Faça login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
