/**
 * Provides the active theme to the whole app.
 *
 *   const s = useStyles();          // compiled SCSS classes: s.card, s.btnText …
 *   const { themeId, mode, scheme, setThemeId, setMode } = useTheme();
 *
 * mode 'system' follows the phone's light/dark setting. If the theme has no
 * stylesheet for the wanted scheme, it falls back to the theme's light one,
 * then to the default theme — so the app always has styles.
 *
 * Persisting the user's choice: onChange({ themeId, mode }) is called when the
 * user changes it (AppRoot saves it in app_meta). restore({ themeId, mode })
 * applies a saved choice at start-up without calling onChange.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DEFAULT_MODE, DEFAULT_THEME_ID, MODE_CHOICES, THEMES } from './themes';

const ThemeContext = createContext(null);

function resolve(themeId, mode, systemScheme) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  const wanted = mode === 'system' ? systemScheme || 'light' : mode;
  const scheme = theme.modes[wanted] ? wanted : 'light';
  const entry = theme.modes[scheme] || THEMES[DEFAULT_THEME_ID].modes.light;
  return { scheme, ...entry };
}

export function ThemeProvider({
  children,
  initialThemeId = DEFAULT_THEME_ID,
  initialMode = DEFAULT_MODE,
  onChange,
}) {
  const systemScheme = useColorScheme();
  const [themeId, setThemeIdState] = useState(initialThemeId);
  const [mode, setModeState] = useState(initialMode);

  const value = useMemo(() => {
    const r = resolve(themeId, mode, systemScheme);
    return {
      themeId,
      mode,
      scheme: r.scheme,
      styles: r.styles,
      statusBar: r.statusBar,
      themes: Object.entries(THEMES).map(([id, t]) => ({
        id,
        name: t.name,
        modes: Object.keys(t.modes),
      })),
      setThemeId: id => {
        setThemeIdState(id);
        onChange?.({ themeId: id, mode });
      },
      setMode: m => {
        setModeState(m);
        onChange?.({ themeId, mode: m });
      },
      restore: saved => {
        if (saved?.themeId && THEMES[saved.themeId]) {
          setThemeIdState(saved.themeId);
        }
        if (saved?.mode && MODE_CHOICES.includes(saved.mode)) {
          setModeState(saved.mode);
        }
      },
    };
  }, [themeId, mode, systemScheme, onChange]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

/** Compiled style classes of the active theme + mode. */
export function useStyles() {
  return useTheme().styles;
}
