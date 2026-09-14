import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';

const App = () => {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Restauration de la session depuis le localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setIsReady(true);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Attendre la restauration de session avant de rendre
  if (!isReady) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mali-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/chat" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/chat" replace />
            ) : (
              <RegisterPage onLogin={handleLogin} />
            )
          }
        />

        {/* Routes protégées */}
        <Route
          path="/chat"
          element={
            user ? (
              <ChatPage user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user?.is_admin ? (
              <AdminPage user={user} />
            ) : (
              <Navigate to="/chat" replace />
            )
          }
        />

        {/* Redirection par défaut */}
        <Route
          path="*"
          element={<Navigate to={user ? '/chat' : '/login'} replace />}
        />
      </Routes>
    </Router>
  );
};

export default App;
