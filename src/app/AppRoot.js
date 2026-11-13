/**
 * App root: providers + database start-up gate.
 *
 *   SafeAreaProvider → KeyboardProvider → ThemeProvider → (DB ready?) →
 *   AppNavigator, with AlertHost on top of everything.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ThemeProvider, useStyles, useTheme } from '@/theme';
import { AlertHost } from '@/components/alert';
import AppNavigator from '@/navigation/AppNavigator';
import { DropdownDismissArea } from '@/components/form/dropdownDismiss';
import { getMeta, initDb, setMeta } from '@/data';

/** Save the user's theme choice (called by ThemeProvider on change). */
function saveThemeChoice({ themeId, mode }) {
  Promise.all([
    setMeta('theme_id', themeId),
    setMeta('theme_mode', mode),
  ]).catch(() => {});
}

function Startup() {
  const s = useStyles();
  const { statusBar, restore } = useTheme();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initDb()
      .then(() => Promise.all([getMeta('theme_id'), getMeta('theme_mode')]))
      .then(([themeId, mode]) => {
        restore({ themeId, mode });
        setReady(true);
      })
      .catch(e => setError(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar
        barStyle={statusBar}
        backgroundColor={s.navHeader.backgroundColor}
      />
      {error ? (
        <SafeAreaView style={s.center}>
          <Text style={s.subtitle}>Could not open the database</Text>
          <Text style={s.errorText}>{String(error.message || error)}</Text>
        </SafeAreaView>
      ) : !ready ? (
        <SafeAreaView style={s.center}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      ) : (
        <DropdownDismissArea style={s.flex}>
          <AppNavigator />
        </DropdownDismissArea>
      )}
      <AlertHost />
    </>
  );
}

export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider onChange={saveThemeChoice}>
          <Startup />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
