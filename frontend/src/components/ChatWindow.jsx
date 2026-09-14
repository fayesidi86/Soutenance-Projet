import React, { useState, useRef, useEffect } from 'react';
import { Send, Scale, User, Loader2, BookOpen, Sparkles, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '../services/api';
import SourceCard from './SourceCard';
import DisclaimerBanner from './DisclaimerBanner';
import { useTheme } from '../context/ThemeContext';

const ChatWindow = ({ activeConversationId, setActiveConversationId, triggerRefresh, onMenuClick }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { isDark } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger l'historique de la discussion sélectionnée
  useEffect(() => {
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

    await chatAPI.askStream(question, activeConversationId, {
      onMetadata: (metadata) => {
        if (isNewConversation && metadata.conversation_id) {
          setActiveConversationId(metadata.conversation_id);
          triggerRefresh();
          isNewConversation = false;
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
          }
          return next;
        });
      },
      onComplete: () => {
        setIsLoading(false);
        inputRef.current?.focus();
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
    <div className={`flex-1 flex flex-col h-screen transition-colors duration-300 ${
      isDark ? 'bg-surface-950' : 'bg-slate-100'
    }`}>
      {/* Header */}
      <header className={`glass border-b px-4 py-4 sm:px-6 transition-colors duration-300 ${
        isDark ? 'border-surface-700/30' : 'border-surface-200/60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Menu Button */}
            <button
              onClick={onMenuClick}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 lg:hidden flex-shrink-0 ${
                isDark ? 'bg-surface-800/50 hover:bg-surface-700/50' : 'bg-white/70 hover:bg-white'
              }`}
              title="Ouvrir le menu"
            >
              <Menu className={`w-5 h-5 ${isDark ? 'text-surface-300' : 'text-surface-600'}`} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mali-green/20 to-mali-gold/10 flex items-center justify-center border border-mali-green/20 flex-shrink-0">
              <Scale className="w-5 h-5 text-mali-green" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-base sm:text-lg font-bold truncate ${
                isDark ? 'text-white' : 'text-surface-900'
              }`}>
                Assistant Juridique
              </h2>
              <p className={`text-xs truncate ${
                isDark ? 'text-surface-400' : 'text-surface-500'
              }`}>
                Droit malien • Réponses sourcées
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-full bg-mali-green/10 border border-mali-green/20">
              <span className="w-2 h-2 rounded-full bg-mali-green animate-pulse-slow"></span>
              <span className="text-xs font-medium text-mali-green hidden sm:inline">En ligne</span>
            </span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {isHistoryLoading ? (
          /* History Loading State */
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-mali-green animate-spin" />
              <span className="text-sm text-surface-400">
                Chargement de la discussion...
              </span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-lg animate-fade-in">
              {/* Decorative Icon */}
              <div className="w-20 h-20 rounded-2xl gradient-mali mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-mali-green/20">
                <Scale className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Bienvenue sur l'Assistant Juridique
              </h3>
              <p className="text-surface-400 mb-8 leading-relaxed">
                Posez vos questions sur le droit malien. Je rechercherai les textes de loi
                pertinents et vous fournirai des réponses sourcées.
              </p>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="glass-light text-left p-3 rounded-xl text-sm text-surface-300 
                               hover:bg-surface-700/40 hover:text-white hover:border-mali-green/20
                               transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-mali-gold mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span>{q}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="mt-8">
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
                className={`flex gap-4 animate-slide-up ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mali-green/20 to-mali-gold/10 flex items-center justify-center border border-mali-green/20 flex-shrink-0 mt-1">
                    <Scale className="w-4 h-4 text-mali-green" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] ${
                    msg.role === 'user' ? 'order-first' : ''
                  }`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user'
                        ? 'bg-mali-green/15 border border-mali-green/20 text-surface-100'
                        : msg.isError
                        ? 'glass border-mali-red/20 bg-mali-red/5 text-surface-200'
                        : isDark
                        ? 'glass text-surface-200'
                        : 'bg-white/90 border border-surface-200/60 text-surface-800 shadow-sm'
                    }`}
                  >
                    <div className="message-content text-sm leading-relaxed">
                      {msg.role === 'user' ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : !msg.content && isLoading && index === messages.length - 1 ? (
                        <div className="flex items-center gap-3 py-1">
                          <Loader2 className="w-4 h-4 text-mali-green animate-spin" />
                          <span className="text-xs text-surface-400">
                            Recherche dans les textes de loi et rédaction en cours...
                          </span>
                        </div>
                      ) : (
                        <div>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({children}) => <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>,
                              h2: ({children}) => <h2 className="text-sm font-bold text-surface-100 mb-2 mt-3 first:mt-0">{children}</h2>,
                              h3: ({children}) => <h3 className="text-sm font-semibold text-surface-200 mb-1 mt-2 first:mt-0">{children}</h3>,
                              p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                              em: ({children}) => <em className="italic text-surface-300">{children}</em>,
                              ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-0.5 pl-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-0.5 pl-1">{children}</ol>,
                              li: ({children}) => <li className="text-surface-200 leading-relaxed">{children}</li>,
                              blockquote: ({children}) => <blockquote className="border-l-2 border-mali-green/50 pl-3 my-2 text-surface-300 italic">{children}</blockquote>,
                              code: ({inline, children}) => inline
                                ? <code className="bg-surface-700/60 text-mali-gold px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                                : <pre className="bg-surface-800/80 border border-surface-700/30 rounded-lg p-3 my-2 overflow-x-auto"><code className="text-xs font-mono text-surface-200">{children}</code></pre>,
                              a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-mali-green underline underline-offset-2 hover:text-mali-green-light transition-colors">{children}</a>,
                              hr: () => <hr className="border-surface-700/40 my-3" />,
                              table: ({children}) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
                              th: ({children}) => <th className="border border-surface-600/40 px-2 py-1 bg-surface-700/50 font-semibold text-surface-200 text-left">{children}</th>,
                              td: ({children}) => <td className="border border-surface-600/30 px-2 py-1 text-surface-300">{children}</td>,
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

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <BookOpen className="w-3.5 h-3.5 text-surface-500" />
                        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
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
                  <div className="w-9 h-9 rounded-xl bg-surface-700/50 flex items-center justify-center border border-surface-600/30 flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-surface-300" />
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

      {/* Input Area */}
      <div className={`border-t backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 transition-colors duration-300 ${
        isDark
          ? 'border-surface-700/30 bg-surface-900/50'
          : 'border-surface-200/60 bg-white/70'
      }`}>
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question juridique..."
              rows={1}
              className="input-field resize-none pr-4 min-h-[48px] max-h-[120px]"
              style={{
                height: 'auto',
                minHeight: '48px',
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
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
              input.trim() && !isLoading && !isHistoryLoading
                ? 'bg-mali-green hover:bg-mali-green-dark text-white shadow-lg shadow-mali-green/30 hover:-translate-y-0.5'
                : 'bg-surface-700/50 text-surface-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
