import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const SourceCard = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);

  // Couleurs rotatives pour les badges
  const badgeColors = [
    'from-mali-green/20 to-mali-green/5 border-mali-green/30 text-mali-green',
    'from-mali-gold/20 to-mali-gold/5 border-mali-gold/30 text-mali-gold',
    'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
  ];
  const colorClass = badgeColors[index % badgeColors.length];

  return (
    <div className="glass-light rounded-xl overflow-hidden transition-all duration-300 hover:border-surface-500/30 animate-slide-up"
         style={{ animationDelay: `${index * 100}ms` }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-700/20 transition-colors duration-200"
      >
        {/* Source Index Badge */}
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} border flex items-center justify-center flex-shrink-0`}>
          <span className="text-xs font-bold">{index + 1}</span>
        </div>

        {/* Source Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-surface-200 truncate">
              {source.document_title}
            </p>
          </div>
          <p className="text-xs text-mali-gold font-medium mt-0.5">
            {source.article_reference}
          </p>
        </div>

        {/* Relevance Score */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-surface-500">Pertinence</p>
            <p className="text-xs font-bold text-mali-green">
              {Math.max(0, (1 - source.distance) * 100).toFixed(0)}%
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-surface-700/20 animate-fade-in">
          <p className="text-xs text-surface-300 leading-relaxed whitespace-pre-wrap">
            {source.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default SourceCard;
