import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative p-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
        isDark
          ? 'bg-surface-800/80 text-amber-400 hover:bg-surface-700 border border-surface-700/60 hover:border-amber-400/40 shadow-sm'
          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-300 shadow-sm'
      } ${className}`}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label="Changer le thème"
    >
      {isDark ? (
        <Sun className="w-5 h-5 animate-scale-in text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 animate-scale-in text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;
