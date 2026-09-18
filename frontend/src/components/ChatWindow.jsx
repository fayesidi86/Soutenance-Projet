import React, { useState, useRef, useEffect } from 'react';
import { Send, Scale, User, Loader2, BookOpen, Sparkles, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '../services/api';
import SourceCard from './SourceCard';
import DisclaimerBanner from './DisclaimerBanner';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const ChatWindow = ({ activeConversationId, setActiveConversationId, triggerRefresh, onMenuClick }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const skipHistoryFetchRef = useRef(false);
  const { isDark } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger l'historique de la discussion sélectionnée
  useEffect(() => {
    // Éviter d'écraser les messages en plein streaming lors de l'attribution de l'ID
    if (skipHistoryFetchRef.current) {
      skipHistoryFetchRef.current = false;
      return;
    }

    const loadConversationHistory = async () => {
      if (activeConversationId === null) {
        setMessages([]);
        return;
      }

      setIsHistoryLoading(true);
      try {
        const response = await chatAPI.getConversationDetail(activeConversationId);
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Erreur lors du chargement des messages de la discussion:', error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadConversationHistory();
  }, [activeConversationId]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    // Ajouter le message utilisateur et un message assistant vide pour la réception streaming
    const userMessage = { role: 'user', content: question };
    const initialAssistantMessage = { role: 'assistant', content: '', sources: [] };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setIsLoading(true);

    let isNewConversation = (activeConversationId === null);
    let assignedConversationId = activeConversationId;

    await chatAPI.askStream(question, activeConversationId, {
      onMetadata: (metadata) => {
        if (metadata.conversation_id) {
          assignedConversationId = metadata.conversation_id;
          if (isNewConversation) {
            skipHistoryFetchRef.current = true;
            setActiveConversationId(metadata.conversation_id);
            triggerRefresh();
            isNewConversation = false;
          }
        }
        if (metadata.sources) {
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
              next[lastIdx] = { ...next[lastIdx], sources: metadata.sources };
            }
            return next;
          });
        }
      },
      onToken: (token) => {
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
            next[lastIdx] = {
              ...next[lastIdx],
              content: next[lastIdx].content + token,
            };
          } else {
            next.push({ role: 'assistant', content: token, sources: [] });
          }
          return next;
        });
      },
      onError: (errMsg) => {
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
            next[lastIdx] = {
              role: 'assistant',
              content: errMsg || 'Une erreur est survenue lors du traitement de votre question. Veuillez réessayer.',
              isError: true,
            };
          } else {
            next.push({
              role: 'assistant',
              content: errMsg || 'Une erreur est survenue.',
              isError: true,
            });
          }
          return next;
        });
      },
      onComplete: async () => {
        setIsLoading(false);
        inputRef.current?.focus();
        // Synchronisation automatique de sécurité pour afficher la réponse sans actualisation
        const targetId = assignedConversationId || activeConversationId;
        if (targetId) {
          try {
            const resp = await chatAPI.getConversationDetail(targetId);
            if (resp.data?.messages && resp.data.messages.length > 0) {
              setMessages(resp.data.messages);
            }
          } catch (e) {
            console.error('Erreur lors de la synchronisation des messages:', e);
          }
        }
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'Quels sont les droits fondamentaux dans la Constitution du Mali ?',
    'Quelles sont les conditions du mariage selon le Code de la famille ?',
    'Comment se déroule une procédure de divorce au Mali ?',
    'Quels sont les droits des travailleurs selon le Code du travail ?',
  ];

  return (
    <div className={`flex-1 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-surface-950' : 'bg-slate-50'
    }`}>
      {/* Header avec bouton 3 barres fixe à gauche et ThemeToggle en haut à droite */}
      <header className={`sticky top-0 z-20 border-b px-3 py-3 sm:px-6 sm:py-4 backdrop-blur-xl transition-colors duration-300 flex-shrink-0 ${
        isDark ? 'border-surface-700/40 bg-surface-950/90' : 'border-slate-200/90 bg-white/90 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Bouton 3 barres fixe (Menu / Historique / Dashboard) */}
            <button
              id="mobile-menu-btn"
              onClick={onMenuClick}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 lg:hidden flex-shrink-0 shadow-md ${
                isDark
                  ? 'bg-surface-800 hover:bg-surface-700 text-white border border-surface-700/60 shadow-black/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
              title="Ouvrir le menu et les discussions"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mali-green/20 to-mali-gold/10 flex items-center justify-center border border-mali-green/20 flex-shrink-0">
              <Scale className="w-5 h-5 text-mali-green" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-sm sm:text-lg font-bold truncate ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Assistant Juridique
              </h2>
              <p className={`text-xxs sm:text-xs truncate ${
                isDark ? 'text-surface-400' : 'text-slate-500'
              }`}>
                Droit malien • Réponses sourcées
              </p>
            </div>
          </div>

          {/* Actions à droite : Statut + Bouton Thème */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-full bg-mali-green/10 border border-mali-green/20">
              <span className="w-2 h-2 rounded-full bg-mali-green animate-pulse-slow"></span>
              <span className="text-xs font-medium text-mali-green hidden sm:inline">En ligne</span>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Messages Area — Fluid Scrollable with Momentum */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {isHistoryLoading ? (
          /* History Loading State */
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-mali-green animate-spin" />
              <span className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
                Chargement de la discussion...
              </span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="text-center max-w-lg animate-fade-in px-2">
              {/* Decorative Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-mali mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-2xl shadow-mali-green/20">
                <Scale className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Bienvenue sur l'Assistant Juridique
              </h3>
              <p className={`mb-6 sm:mb-8 leading-relaxed text-xs sm:text-sm ${
                isDark ? 'text-surface-400' : 'text-slate-600'
              }`}>
                Posez vos questions sur le droit malien. Je rechercherai les textes de loi
                pertinents et vous fournirai des réponses vulgarisées et sourcées.
              </p>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className={`suggestion-btn ${
                      isDark
                        ? 'text-surface-300 hover:text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-mali-gold mt-0.5 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                      <span className="font-medium text-xs sm:text-sm">{q}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="mt-6 sm:mt-8">
                <DisclaimerBanner />
              </div>
            </div>
          </div>
        ) : (
          /* Messages List */
          <>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 sm:gap-4 animate-slide-up ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-mali-green/20 to-mali-gold/10 flex items-center justify-center border border-mali-green/20 flex-shrink-0 mt-1">
                    <Scale className="w-4 h-4 text-mali-green" />
                  </div>
                )}

                <div
                  className={`max-w-[90%] sm:max-w-[78%] ${
                    msg.role === 'user' ? 'order-first' : ''
                  }`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 transition-all duration-200 ${
                      msg.role === 'user'
                        ? isDark
                          ? 'bg-mali-green/20 border border-mali-green/30 text-emerald-100 shadow-sm'
                          : 'bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/15'
                        : msg.isError
                        ? 'glass border-mali-red/30 bg-mali-red/5 text-mali-red'
                        : isDark
                        ? 'glass text-surface-200'
                        : 'bg-white border border-slate-200/90 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="message-content text-xs sm:text-sm leading-relaxed">
                      {msg.role === 'user' ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : !msg.content && isLoading && index === messages.length - 1 ? (
                        <div className="flex items-center gap-3 py-1">
                          <Loader2 className="w-4 h-4 text-mali-green animate-spin" />
                          <span className={`text-xs ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                            Recherche dans les textes de loi et rédaction en cours...
                          </span>
                        </div>
                      ) : (
                        <div>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({children}) => <h1 className={`text-base font-bold mb-2 mt-3 first:mt-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>{children}</h1>,
                              h2: ({children}) => <h2 className={`text-sm font-bold mb-2 mt-3 first:mt-0 ${isDark ? 'text-surface-100' : 'text-slate-900'}`}>{children}</h2>,
                              h3: ({children}) => <h3 className={`text-sm font-semibold mb-1 mt-2 first:mt-0 ${isDark ? 'text-surface-200' : 'text-slate-800'}`}>{children}</h3>,
                              p: ({children}) => <p className={`mb-2 last:mb-0 leading-relaxed ${isDark ? 'text-surface-200' : 'text-slate-800'}`}>{children}</p>,
                              strong: ({children}) => <strong className={`font-bold ${isDark ? 'text-mali-gold' : 'text-slate-950 font-semibold'}`}>{children}</strong>,
                              em: ({children}) => <em className={`italic ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>{children}</em>,
                              ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 pl-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 pl-1">{children}</ol>,
                              li: ({children}) => <li className={`leading-relaxed ${isDark ? 'text-surface-200' : 'text-slate-800'}`}>{children}</li>,
                              blockquote: ({children}) => <blockquote className={`border-l-3 border-mali-green pl-3 my-2 italic py-1 rounded-r ${isDark ? 'text-surface-300 bg-surface-800/30' : 'text-slate-700 bg-slate-100/80'}`}>{children}</blockquote>,
                              pre: ({children}) => (
                                <pre className={`rounded-lg p-3 my-2 overflow-x-auto text-xs ${isDark ? 'bg-surface-800/80 border border-surface-700/30 text-surface-200' : 'bg-slate-900 text-slate-100 border border-slate-800'}`}>
                                  {children}
                                </pre>
                              ),
                              code: ({className, children}) => {
                                if (className) {
                                  return <code className={`text-xs font-mono ${isDark ? 'text-surface-200' : 'text-slate-100'}`}>{children}</code>;
                                }
                                return <code className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${isDark ? 'bg-surface-700/60 text-mali-gold' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>{children}</code>;
                              },
                              a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-mali-green underline underline-offset-2 hover:text-mali-green-dark font-medium transition-colors">{children}</a>,
                              hr: () => <hr className={`my-3 ${isDark ? 'border-surface-700/40' : 'border-slate-200'}`} />,
                              table: ({children}) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
                              th: ({children}) => <th className={`border px-3 py-1.5 font-semibold text-left ${isDark ? 'border-surface-600/40 bg-surface-700/50 text-surface-200' : 'border-slate-300 bg-slate-100 text-slate-900'}`}>{children}</th>,
                              td: ({children}) => <td className={`border px-3 py-1.5 ${isDark ? 'border-surface-600/30 text-surface-300' : 'border-slate-200 text-slate-800'}`}>{children}</td>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {isLoading && index === messages.length - 1 && (
                            <span className="inline-block w-2 h-4 ml-1 bg-mali-green animate-pulse align-middle rounded-sm"></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sources — affichées uniquement quand le streaming est terminé pour ce message */}
                  {msg.sources && msg.sources.length > 0 && (!isLoading || index < messages.length - 1) && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <BookOpen className="w-3.5 h-3.5 text-surface-500" />
                        <p className={`text-xs font-semibold uppercase tracking-wider ${
                          isDark ? 'text-surface-400' : 'text-slate-600'
                        }`}>
                          Sources juridiques ({msg.sources.length})
                        </p>
                      </div>
                      {msg.sources.map((source, sIndex) => (
                        <SourceCard
                          key={sIndex}
                          source={source}
                          index={sIndex}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${
                    isDark ? 'bg-surface-700/50 border border-surface-600/30' : 'bg-emerald-100 border border-emerald-200 text-emerald-800'
                  }`}>
                    <User className={`w-4 h-4 ${isDark ? 'text-surface-300' : 'text-emerald-700'}`} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Compact Disclaimer */}
      {messages.length > 0 && <DisclaimerBanner variant="compact" />}

      {/* Input Area — Fixe et Pinned en bas pour mobile / Android */}
      <div className={`sticky bottom-0 z-20 border-t backdrop-blur-xl px-3 py-2.5 sm:px-6 sm:py-3.5 transition-colors duration-300 flex-shrink-0 ${
        isDark
          ? 'border-surface-700/40 bg-surface-950/95'
          : 'border-slate-200/90 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]'
      }`}>
        <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question juridique..."
              rows={1}
              className={`input-field resize-none pr-4 min-h-[46px] sm:min-h-[48px] max-h-[120px] text-xs sm:text-sm ${
                isDark
                  ? 'bg-surface-900/90 text-white placeholder:text-surface-500'
                  : 'bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:bg-white'
              }`}
              style={{
                height: 'auto',
                minHeight: '46px',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isHistoryLoading}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
              input.trim() && !isLoading && !isHistoryLoading
                ? 'bg-mali-green hover:bg-mali-green-dark text-white shadow-lg shadow-mali-green/30 hover:-translate-y-0.5 active:translate-y-0'
                : isDark
                ? 'bg-surface-800 text-surface-500 cursor-not-allowed border border-surface-700/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Envoyer le message"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
