import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationSettings } from '@/hooks/useNotifications';

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  resetToDefaults: () => void;
}

const defaultSettings: NotificationSettings = {
  pushNotifications: true,
  messageNotifications: true,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error parsing notification settings:', error);
        setSettings(defaultSettings);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return (
    <NotificationContext.Provider value={{ settings, updateSettings, resetToDefaults }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationSettings = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationSettings must be used within a NotificationProvider');
  }
  return context;
};