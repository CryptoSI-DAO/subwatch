import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  separator: string;
  primary: string;
  danger: string;
  success: string;
  warning: string;
  tabBar: string;
  tabBarBorder: string;
  headerBg: string;
  inputBg: string;
  modalOverlay: string;
  emptyIcon: string;
  emptyText: string;
  emptySubtext: string;
  inactiveBadge: string;
  inactiveBadgeText: string;
  changeUp: string;
  changeUpBg: string;
  changeDown: string;
  changeDownBg: string;
  barBg: string;
  svgText: string;
  gridLine: string;
}

const lightColors: ThemeColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  separator: '#E5E5EA',
  primary: '#007AFF',
  danger: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  headerBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  modalOverlay: 'rgba(0,0,0,0.4)',
  emptyIcon: '#8E8E93',
  emptyText: '#8E8E93',
  emptySubtext: '#C7C7CC',
  inactiveBadge: 'rgba(0,0,0,0.3)',
  inactiveBadgeText: '#FFFFFF',
  changeUp: '#FF3B30',
  changeUpBg: '#FF3B3015',
  changeDown: '#34C759',
  changeDownBg: '#34C75915',
  barBg: '#E5E5EA',
  svgText: '#8E8E93',
  gridLine: '#F2F2F7',
};

const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  separator: '#38383A',
  primary: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  tabBar: '#1C1C1E',
  tabBarBorder: '#38383A',
  headerBg: '#1C1C1E',
  inputBg: '#2C2C2E',
  modalOverlay: 'rgba(0,0,0,0.7)',
  emptyIcon: '#636366',
  emptyText: '#636366',
  emptySubtext: '#48484A',
  inactiveBadge: 'rgba(255,255,255,0.2)',
  inactiveBadgeText: '#FFFFFF',
  changeUp: '#FF453A',
  changeUpBg: '#FF453A20',
  changeDown: '#30D158',
  changeDownBg: '#30D15820',
  barBg: '#38383A',
  svgText: '#8E8E93',
  gridLine: '#2C2C2E',
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

const THEME_STORAGE_KEY = '@subwatch_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const isDark =
    mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
