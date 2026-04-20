import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode, SmartMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  smartMode: SmartMode | null;
  setSmartMode: (mode: SmartMode | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [smartMode, setSmartMode] = useState<SmartMode | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('worklog_theme') as ThemeMode;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-light', 'dark', 'theme-egyptian', 'theme-modern', 'theme-dynamic');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add(`theme-${theme}`);
    }

    localStorage.setItem('worklog_theme', theme);

    // Apply smart mode classes
    root.classList.remove('mode-ramadan', 'mode-focus', 'mode-friday', 'mode-natural', 'mode-emotional');
    if (smartMode) {
      root.classList.add(`mode-${smartMode}`);
    }
  }, [theme, smartMode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, smartMode, setSmartMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
