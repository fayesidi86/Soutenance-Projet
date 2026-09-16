import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useTheme } from '../context/ThemeContext';

const ChatPage = ({ user, onLogout }) => {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDark } = useTheme();

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className={`fixed inset-0 h-[100dvh] max-h-[100dvh] w-full flex overflow-hidden select-none transition-colors duration-300 ${
      isDark ? 'bg-surface-950' : 'bg-slate-100'
    }`}>
      {/* Backdrop overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        user={user}
        onLogout={onLogout}
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        refreshTrigger={refreshTrigger}
        triggerRefresh={triggerRefresh}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ChatWindow
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        triggerRefresh={triggerRefresh}
        onMenuClick={() => setIsSidebarOpen(true)}
      />
    </div>
  );
};

export default ChatPage;
