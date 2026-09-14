import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DisclaimerBanner = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-2 px-4 py-2.5 bg-mali-gold/5 border-t border-mali-gold/10">
        <AlertTriangle className="w-3.5 h-3.5 text-mali-gold/70 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-surface-400 leading-relaxed">
          <span className="font-semibold text-mali-gold/80">Avertissement :</span>{' '}
          Les réponses sont à titre informatif et ne remplacent pas les conseils d'un professionnel du droit.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 border border-mali-gold/20 bg-mali-gold/5 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-mali-gold/15 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-mali-gold" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-mali-gold mb-1">
            Avertissement important
          </h4>
          <p className="text-xs text-surface-300 leading-relaxed">
            <strong className="text-mali-gold/90">AssistantJuridique_MALI</strong> est un
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
