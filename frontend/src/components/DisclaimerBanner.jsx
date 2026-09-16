import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DisclaimerBanner = ({ variant = 'default' }) => {
  const { isDark } = useTheme();

  if (variant === 'compact') {
    return (
      <div className={`flex items-start gap-2 px-4 py-2.5 border-t ${
        isDark ? 'bg-mali-gold/5 border-mali-gold/10' : 'bg-amber-50/80 border-amber-200'
      }`}>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className={`text-xs leading-relaxed ${
          isDark ? 'text-surface-400' : 'text-slate-700'
        }`}>
          <span className="font-bold text-amber-600 dark:text-mali-gold/90">Avertissement :</span>{' '}
          Les réponses sont à titre informatif et ne remplacent pas les conseils d'un professionnel du droit.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border animate-fade-in ${
      isDark 
        ? 'glass border-mali-gold/20 bg-mali-gold/5' 
        : 'bg-amber-50/80 border-amber-200 shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isDark ? 'bg-mali-gold/15' : 'bg-amber-100'
        }`}>
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-mali-gold" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-700 dark:text-mali-gold mb-1">
            Avertissement important
          </h4>
          <p className={`text-xs leading-relaxed ${
            isDark ? 'text-surface-300' : 'text-slate-700'
          }`}>
            <strong className="text-amber-700 dark:text-mali-gold/90 font-bold">AssistantJuridique_MALI</strong> est un
            système basé sur l'intelligence artificielle. Les réponses fournies le sont à
            titre informatif et ne remplacent en aucun cas les conseils d'un professionnel
            du droit (avocat, notaire, juriste). Pour toute décision juridique, veuillez
            consulter un professionnel qualifié.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerBanner;
