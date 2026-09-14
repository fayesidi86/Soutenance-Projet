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
    <div className={`flex h-screen overflow-hidden relative ${
      isDark ? 'bg-surface-950' : 'bg-slate-100'
    }`}>
      {/* Backdrop overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
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
