import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Read saved preference; default to 'light' (KLE Tech Belagavi light mode)
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cms_theme') || 'light'
  );

  useEffect(() => {
    // Set data-theme attribute on <html> so CSS vars switch globally
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cms_theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
