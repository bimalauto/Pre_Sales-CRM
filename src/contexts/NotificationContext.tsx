import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  message: string | null;
  type: 'success' | 'error' | null;
  showMessage: (msg: string, type?: 'success' | 'error') => void;
  clearMessage: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<'success' | 'error' | null>(null);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setType(type);
    setTimeout(() => {
      setMessage(null);
      setType(null);
    }, 3000);
  };

  const clearMessage = () => {
    setMessage(null);
    setType(null);
  };

  return (
    <NotificationContext.Provider value={{ message, type, showMessage, clearMessage }}>
      {children}
    </NotificationContext.Provider>
  );
};
