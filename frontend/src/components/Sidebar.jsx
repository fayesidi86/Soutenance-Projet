import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Shield,
  LogOut,
  Scale,
  ChevronRight,
  Sparkles,
  User,
  Plus,
  Trash2,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { chatAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({
  user,
  onLogout,
  activeConversationId,
  setActiveConversationId,
  refreshTrigger,
  triggerRefresh,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await chatAPI.getConversations();
        setConversations(response.data);
      } catch (err) {
        console.error('Erreur de chargement des conversations:', err);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [refreshTrigger, user]);

  const handleDeleteConversation = async (convId, convTitle) => {
    if (!confirm(`Supprimer la discussion "${convTitle}" ?`)) return;

    try {
      await chatAPI.deleteConversation(convId);
      if (activeConversationId === convId) {
        setActiveConversationId(null);
      }
      triggerRefresh();
    } catch (err) {
      console.error('Erreur lors de la suppression de la conversation:', err);
    }
  };

  const menuItems = [];

  // Ajouter l'item admin si l'utilisateur est admin
  if (user?.is_admin) {
    menuItems.push({
      id: 'admin',
      label: 'Administration',
      icon: Shield,
      path: '/admin',
      description: 'Gérer les documents',
    });
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 h-screen backdrop-blur-xl flex flex-col transform ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 lg:static lg:inset-auto transition-all duration-300 ease-in-out border-r ${
      isDark
        ? 'bg-surface-900/80 border-surface-700/30'
        : 'bg-white/80 border-surface-200/60'
    }`}>
      {/* Logo & Brand */}
      <div className={`p-6 border-b flex items-center justify-between ${
        isDark ? 'border-surface-700/30' : 'border-surface-200/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-mali flex items-center justify-center shadow-lg shadow-mali-green/20">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold leading-tight ${
              isDark ? 'text-white' : 'text-surface-900'
            }`}>
              Assistant<span className="text-gradient-mali">Juridique</span>
            </h1>
            <p className={`text-xs font-medium tracking-wider uppercase ${
              isDark ? 'text-surface-400' : 'text-surface-500'
            }`}>
              Mali
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 lg:hidden flex-shrink-0 ${
            isDark ? 'bg-surface-800/50 hover:bg-surface-700/50' : 'bg-surface-100 hover:bg-surface-200'
          }`}
          title="Fermer le menu"
        >
          <X className={`w-4 h-4 ${isDark ? 'text-surface-300' : 'text-surface-500'}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col min-h-0 overflow-hidden">
        <p className={`text-xs font-semibold uppercase tracking-wider px-3 mb-3 flex-shrink-0 ${
          isDark ? 'text-surface-500' : 'text-surface-400'
        }`}>
          Navigation
        </p>
        
        {/* Actions principales */}
        <div className="space-y-2 flex-shrink-0 mb-4">
          {/* Bouton Nouvelle Discussion */}
          {location.pathname === '/chat' && (
            <button
              onClick={() => {
                setActiveConversationId(null);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
                activeConversationId === null
                  ? 'bg-mali-green/15 border border-mali-green/30 text-mali-green shadow-sm'
                  : isDark
                  ? 'text-surface-300 hover:bg-surface-800/60 hover:text-white border border-transparent'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  activeConversationId === null
                    ? 'bg-mali-green/20 text-mali-green'
                    : isDark
                    ? 'bg-surface-700/40 text-surface-300 group-hover:bg-surface-600/40 group-hover:text-white'
                    : 'bg-slate-200/70 text-slate-700 group-hover:bg-slate-200 group-hover:text-slate-900'
                }`}
              >
                <Plus className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Nouvelle Discussion</p>
                <p
                  className={`text-xs ${
                    activeConversationId === null
                      ? 'text-mali-green/80'
                      : isDark
                      ? 'text-surface-500'
                      : 'text-slate-500'
                  }`}
                >
                  Démarrer un nouveau chat
                </p>
              </div>
            </button>
          )}

          {/* Autres pages de navigation (ex: Admin) */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-mali-green/15 border border-mali-green/30 text-mali-green shadow-sm'
                    : isDark
                    ? 'text-surface-300 hover:bg-surface-800/60 hover:text-white border border-transparent'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-mali-green/20 text-mali-green'
                      : isDark
                      ? 'bg-surface-700/40 text-surface-300 group-hover:bg-surface-600/40 group-hover:text-white'
                      : 'bg-slate-200/70 text-slate-700 group-hover:bg-slate-200 group-hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p
                    className={`text-xs ${
                      isActive
                        ? 'text-mali-green/80'
                        : isDark
                        ? 'text-surface-500'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-all duration-300 ${
                    isActive
                      ? 'text-mali-green opacity-100'
                      : 'opacity-0 group-hover:opacity-50'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Historique des discussions */}
        {location.pathname === '/chat' && (
          <div className={`flex-1 flex flex-col min-h-0 border-t pt-4 ${
            isDark ? 'border-surface-700/30' : 'border-slate-200'
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-wider px-3 mb-2 flex-shrink-0 ${
              isDark ? 'text-surface-500' : 'text-slate-500'
            }`}>
              Historique
            </p>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {conversations.length === 0 ? (
                <p className={`text-xs px-3 py-2 italic ${
                  isDark ? 'text-surface-500' : 'text-slate-400'
                }`}>
                  Aucun historique
                </p>
              ) : (
                conversations.map((conv) => {
                  const isConvActive = activeConversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      className={`group w-full flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-200 border ${
                        isConvActive
                          ? isDark
                            ? 'bg-surface-800/90 border-surface-700 text-white shadow-sm'
                            : 'bg-slate-100 border-slate-300 text-slate-900 font-semibold shadow-sm'
                          : isDark
                          ? 'border-transparent text-surface-400 hover:bg-surface-800/40 hover:text-white'
                          : 'border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveConversationId(conv.id);
                          if (onClose) onClose();
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      >
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                          isConvActive
                            ? 'text-mali-green'
                            : isDark
                            ? 'text-surface-500'
                            : 'text-slate-500'
                        }`} />
                        <span className="text-xs sm:text-sm truncate flex-1">
                          {conv.title}
                        </span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id, conv.title);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-mali-red/10 flex items-center justify-center transition-all duration-200 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-surface-400 hover:text-mali-red" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Theme Toggle + AI Badge */}
      <div className="px-4 pb-3 space-y-2">
        {/* Bouton toggle thème */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 group ${
            isDark
              ? 'bg-surface-800/50 border-surface-700/30 hover:bg-surface-700/50 text-surface-300 hover:text-white'
              : 'bg-white/60 border-surface-300/40 hover:bg-white/80 text-surface-600 hover:text-surface-900'
          }`}
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
            isDark ? 'bg-mali-gold/10' : 'bg-mali-gold/20'
          }`}>
            {isDark ? (
              <Sun className="w-4 h-4 text-mali-gold transition-transform duration-500 group-hover:rotate-90" />
            ) : (
              <Moon className="w-4 h-4 text-surface-600 transition-transform duration-500 group-hover:-rotate-12" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold">
              {isDark ? 'Mode clair' : 'Mode sombre'}
            </p>
            <p className={`text-xs ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
              {isDark ? 'Activer le thème lumineux' : 'Activer le thème sombre'}
            </p>
          </div>
          {/* Toggle pill */}
          <div className={`w-9 h-5 rounded-full border transition-all duration-300 relative flex-shrink-0 ${
            isDark
              ? 'bg-surface-700 border-surface-600'
              : 'bg-mali-green border-mali-green'
          }`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
              isDark ? 'left-0.5' : 'left-4'
            }`} />
          </div>
        </button>

        {/* AI Badge */}
        <div className="glass-light rounded-xl p-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-mali-gold" />
          <p className={`text-xs ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
            Propulsé par <span className="text-mali-gold font-semibold">Gemini AI</span>
          </p>
        </div>
      </div>

      {/* User Profile & Logout */}
      <div className={`p-4 border-t ${
        isDark ? 'border-surface-700/30' : 'border-surface-200/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mali-green/20 to-mali-gold/20 flex items-center justify-center border border-surface-600/30">
            <User className="w-5 h-5 text-surface-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${
              isDark ? 'text-white' : 'text-surface-900'
            }`}>
              {user?.full_name || 'Utilisateur'}
            </p>
            <p className={`text-xs truncate ${
              isDark ? 'text-surface-400' : 'text-surface-500'
            }`}>
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-lg bg-surface-800/50 hover:bg-mali-red/20 flex items-center justify-center transition-all duration-300 group"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4 text-surface-400 group-hover:text-mali-red transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
