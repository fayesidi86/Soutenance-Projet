import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/chat');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Erreur de connexion. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDark ? 'bg-surface-950' : 'bg-slate-100'
    }`}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 gradient-mali-subtle"></div>
        <div className={`absolute inset-0 ${
          isDark ? 'bg-surface-950/60' : 'bg-white/40'
        }`}></div>

        {/* Decorative Circles */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-mali-green/5 blur-3xl"></div>
        <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-mali-gold/5 blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-mali flex items-center justify-center shadow-2xl shadow-mali-green/30">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Assistant<span className="text-gradient-mali">Juridique</span>
              </h1>
              <p className="text-surface-400 font-medium">République du Mali</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Le droit malien à<br />
            <span className="text-gradient-mali">portée de main</span>
          </h2>
          <p className="text-lg text-surface-300 leading-relaxed max-w-md">
            Accédez instantanément aux textes de loi du Mali grâce à notre assistant
            juridique propulsé par l'intelligence artificielle.
          </p>

          {/* Mali Flag Accent */}
          <div className="flex gap-1 mt-12">
            <div className="w-16 h-1.5 rounded-full bg-mali-green"></div>
            <div className="w-16 h-1.5 rounded-full bg-mali-gold"></div>
            <div className="w-16 h-1.5 rounded-full bg-mali-red"></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 rounded-xl gradient-mali flex items-center justify-center shadow-lg">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Assistant<span className="text-gradient-mali">Juridique</span>
            </h1>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Bon retour !</h2>
            <p className="text-surface-400">
              Connectez-vous pour accéder à l'assistant juridique.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-mali-red/10 border border-mali-red/20 text-mali-red text-sm animate-slide-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center text-sm text-surface-400 mt-8">
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="text-mali-green font-semibold hover:text-mali-green-dark transition-colors"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
