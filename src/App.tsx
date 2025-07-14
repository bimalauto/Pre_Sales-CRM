import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import ResetPasswordForm from './components/Auth/ResetPasswordForm';
// ...existing code...

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleGetStarted = () => {
    setShowAuth(true);
    setIsLogin(false); // Start with registration form
  };

  const toggleAuthForm = () => {
    setIsLogin(!isLogin);
    setShowResetPassword(false);
  };

  const handleRegistrationSuccess = () => {
    setIsLogin(true); // Switch to login form after successful registration
  };

  const handleForgotPassword = () => {
    setShowResetPassword(true);
  };

  const handleBackToLogin = () => {
    setShowResetPassword(false);
    setIsLogin(true);
  };

  if (currentUser) {
    return <Dashboard />;
  }

  if (showAuth) {
    if (showResetPassword) {
      return <ResetPasswordForm onBackToLogin={handleBackToLogin} />;
    }
    return isLogin ? (
      <LoginForm onToggleForm={toggleAuthForm} onForgotPassword={handleForgotPassword} />
    ) : (
      <RegisterForm onToggleForm={toggleAuthForm} onRegistrationSuccess={handleRegistrationSuccess} />
    );
  }

  return <LandingPage onGetStarted={handleGetStarted} />;
};

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <NotificationBar />
        <Router>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}
const NotificationBar = () => {
  const { message, type } = useNotification();
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        padding: '12px 24px',
        borderRadius: 8,
        background: type === 'success' ? '#4ade80' : '#f87171',
        color: '#fff',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {message}
    </div>
  );
};

export default App;