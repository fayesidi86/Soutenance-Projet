import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SourceCard = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);
  const { isDark } = useTheme();

  // Couleurs rotatives pour les badges
  const badgeColors = [
    'from-mali-green/20 to-mali-green/5 border-mali-green/30 text-mali-green',
    'from-mali-gold/20 to-mali-gold/5 border-mali-gold/30 text-amber-600 dark:text-mali-gold',
    'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-600 dark:text-blue-400',
    'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-600 dark:text-purple-400',
  ];
  const colorClass = badgeColors[index % badgeColors.length];

  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 border animate-slide-up ${
      isDark
        ? 'glass-light border-surface-700/30 hover:border-surface-600/40'
        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
    }`}
         style={{ animationDelay: `${index * 100}ms` }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors duration-200 ${
          isDark ? 'hover:bg-surface-700/20' : 'hover:bg-slate-50'
        }`}
      >
        {/* Source Index Badge */}
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} border flex items-center justify-center flex-shrink-0 font-bold text-xs`}>
          <span>{index + 1}</span>
        </div>

        {/* Source Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-surface-400' : 'text-slate-500'}`} />
            <p className={`text-xs sm:text-sm font-semibold truncate ${
              isDark ? 'text-surface-200' : 'text-slate-900'
            }`}>
              {source.document_title}
            </p>
          </div>
          <p className={`text-xs font-medium mt-0.5 ${
            isDark ? 'text-mali-gold' : 'text-amber-700 font-semibold'
          }`}>
            {source.article_reference}
          </p>
        </div>

        {/* Relevance Score */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className={`text-xxs sm:text-xs ${isDark ? 'text-surface-500' : 'text-slate-500'}`}>Pertinence</p>
            <p className="text-xs font-bold text-mali-green">
              {Math.max(0, (1 - source.distance) * 100).toFixed(0)}%
            </p>
          </div>
          {expanded ? (
            <ChevronUp className={`w-4 h-4 ${isDark ? 'text-surface-400' : 'text-slate-500'}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-surface-400' : 'text-slate-500'}`} />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className={`px-4 pb-4 pt-2 border-t animate-fade-in ${
          isDark ? 'border-surface-700/20 bg-surface-900/30' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
            isDark ? 'text-surface-300' : 'text-slate-700'
          }`}>
            {source.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default SourceCard;

