import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

export type BackgroundTheme =
  | 'gray'
  | 'dark'
  | 'cyberpunk'
  | 'natural'
  | 'space';

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    if (!c) continue;
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

interface ThemeContextType {
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [backgroundTheme, setBackgroundThemeState] = useState<BackgroundTheme>(
    () => {
      // Load from cookie or default to 'dark'
      const saved = getCookie('background-theme') as BackgroundTheme;
      return saved || 'dark';
    }
  );

  const setBackgroundTheme = (theme: BackgroundTheme) => {
    setBackgroundThemeState(theme);
    setCookie('background-theme', theme, 365); // Save for 1 year

    // Apply theme to document body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  };

  useEffect(() => {
    // Apply initial theme on mount
    setBackgroundTheme(backgroundTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ backgroundTheme, setBackgroundTheme }}>
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
