import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('Échec de la récupération des identifiants Google.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/chat');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Erreur lors de la connexion avec Google. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('La connexion avec Google a été annulée ou a échoué.');
  };

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
    <div className={`min-h-screen flex transition-colors duration-300 relative ${
      isDark ? 'bg-surface-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Theme Toggle top-right */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 gradient-mali-subtle"></div>
        <div className={`absolute inset-0 ${
          isDark ? 'bg-surface-950/60' : 'bg-slate-900/10'
        }`}></div>

        {/* Decorative Circles */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-mali-green/10 blur-3xl"></div>
        <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-mali-gold/10 blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-mali flex items-center justify-center shadow-2xl shadow-mali-green/30">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Assistant<span className="text-gradient-mali">Juridique</span>
              </h1>
              <p className={`font-medium ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>République du Mali</p>
            </div>
          </div>

          <h2 className={`text-4xl font-bold leading-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Le droit malien à<br />
            <span className="text-gradient-mali">portée de main</span>
          </h2>
          <p className={`text-lg leading-relaxed max-w-md ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
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
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Assistant<span className="text-gradient-mali">Juridique</span>
            </h1>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Bon retour !
            </h2>
            <p className={`${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
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
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className={`input-field pl-11 ${
                    isDark ? 'bg-surface-900/90 text-white' : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`input-field pl-11 pr-11 ${
                    isDark ? 'bg-surface-900/90 text-white' : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? 'text-surface-500 hover:text-surface-300' : 'text-slate-400 hover:text-slate-700'
                  }`}
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
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-lg shadow-mali-green/20"
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-700/50"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`px-3 font-medium ${
                isDark ? 'bg-surface-950 text-surface-400' : 'bg-slate-100 text-slate-500'
              }`}>
                Ou continuer avec
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme={isDark ? 'filled_black' : 'outline'}
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
              locale="fr"
            />
          </div>

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
