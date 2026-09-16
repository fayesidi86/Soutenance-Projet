import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  Mail,
  Lock,
  UserPlus,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const RegisterPage = ({ onLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Échec de l'inscription via Google.");
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
        err.response?.data?.detail || "Erreur lors de l'inscription avec Google. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("L'inscription avec Google a été annulée ou a échoué.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.register(email, password, fullName);
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/chat');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Erreur lors de l'inscription. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex relative transition-colors duration-300 ${
      isDark ? 'bg-surface-950' : 'bg-slate-50'
    }`}>
      {/* Top-Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      {/* Left Panel - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden border-r ${
        isDark ? 'border-surface-800/60' : 'border-slate-200'
      }`}>
        <div className="absolute inset-0 gradient-mali-subtle"></div>
        <div className={`absolute inset-0 ${
          isDark ? 'bg-surface-950/70' : 'bg-white/80'
        }`}></div>

        <div className="absolute top-32 right-20 w-72 h-72 rounded-full bg-mali-gold/10 blur-3xl"></div>
        <div className="absolute bottom-20 left-16 w-64 h-64 rounded-full bg-mali-green/10 blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-mali flex items-center justify-center shadow-2xl shadow-mali-green/30">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Assistant<span className="text-gradient-mali">Juridique</span>
              </h1>
              <p className={`font-semibold text-sm ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
                République du Mali
              </p>
            </div>
          </div>

          <h2 className={`text-4xl font-extrabold leading-tight mb-4 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Rejoignez la<br />
            <span className="text-gradient-mali">communauté juridique</span>
          </h2>
          <p className={`text-lg leading-relaxed max-w-md ${
            isDark ? 'text-surface-300' : 'text-slate-700 font-medium'
          }`}>
            Créez votre compte pour accéder à un assistant juridique intelligent,
            alimenté par les textes de loi officiels du Mali.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-4">
            {[
              'Recherche intelligente dans les textes de loi',
              'Réponses sourcées avec citations d\'articles',
              'Accès 24h/24 à l\'expertise juridique',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-mali-green/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-mali-green"></div>
                </div>
                <p className={`text-sm font-medium ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                  {feature}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mt-12">
            <div className="w-16 h-1.5 rounded-full bg-mali-green"></div>
            <div className="w-16 h-1.5 rounded-full bg-mali-gold"></div>
            <div className="w-16 h-1.5 rounded-full bg-mali-red"></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 rounded-xl gradient-mali flex items-center justify-center shadow-lg">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <h1 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Assistant<span className="text-gradient-mali">Juridique</span>
            </h1>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Créer un compte
            </h2>
            <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
              Inscrivez-vous pour commencer à utiliser l'assistant.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-mali-red/10 border border-mali-red/20 text-mali-red text-sm animate-slide-up font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-surface-300' : 'text-slate-700'
              }`}>
                Nom complet
              </label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${
                  isDark ? 'text-surface-500' : 'text-slate-400'
                }`} />
                <input
                  id="register-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sidi Faye"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-surface-300' : 'text-slate-700'
              }`}>
                Adresse email
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${
                  isDark ? 'text-surface-500' : 'text-slate-400'
                }`} />
                <input
                  id="register-email"
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
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-surface-300' : 'text-slate-700'
              }`}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${
                  isDark ? 'text-surface-500' : 'text-slate-400'
                }`} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  required
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? 'text-surface-500 hover:text-surface-300' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-surface-300' : 'text-slate-700'
              }`}>
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${
                  isDark ? 'text-surface-500' : 'text-slate-400'
                }`} />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le mot de passe"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2 font-semibold shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inscription en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Créer mon compte
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${
                isDark ? 'border-surface-800' : 'border-slate-300'
              }`}></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
              <span className={`px-3 ${
                isDark ? 'bg-surface-950 text-surface-400' : 'bg-slate-50 text-slate-500'
              }`}>
                Ou s'inscrire avec
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
              text="signup_with"
              shape="rectangular"
              width="100%"
              locale="fr"
            />
          </div>

          <p className={`text-center text-sm mt-8 ${
            isDark ? 'text-surface-400' : 'text-slate-600 font-medium'
          }`}>
            Déjà inscrit ?{' '}
            <Link
              to="/login"
              className="text-mali-green font-bold hover:text-mali-green-dark transition-colors underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
