import React, { useMemo } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStyles, useTheme } from '@/theme';
import { ROUTES } from './routes';

import MainTabs from './MainTabs';
import CateringScreen from '@/screens/caterings/CateringScreen';
import WorkDetailScreen from '@/screens/works/WorkDetailScreen';
import WorkFormScreen from '@/screens/works/WorkFormScreen';
import PersonPayScreen from '@/screens/people/PersonPayScreen';
import PeopleScreen from '@/screens/people/PeopleScreen';
import ReportScreen from '@/screens/report/ReportScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import MonthScreen from '@/screens/money/MonthScreen';
import MonthsScreen from '@/screens/money/MonthsScreen';
import LendsScreen from '@/screens/money/LendsScreen';
import MoneySettingsScreen from '@/screens/money/MoneySettingsScreen';
import MoneyReportScreen from '@/screens/money/report/MoneyReportScreen';

const Stack = createNativeStackNavigator();

/**
 * [route, component, options] — screens may change the title.
 * Redesigned screens (Home, Settings, People, Catering, Work form, money)
 * draw their own header, so the stack header is hidden for them.
 * HOME is the bottom tabs (Work = catering Home, Money).
 */
const SCREENS = [
  [ROUTES.HOME, MainTabs, { headerShown: false }],
  [ROUTES.CATERING, CateringScreen, { headerShown: false }],
  [ROUTES.WORK_DETAIL, WorkDetailScreen, { title: 'Work' }],
  [ROUTES.WORK_FORM, WorkFormScreen, { headerShown: false }],
  [ROUTES.PERSON_PAY, PersonPayScreen, { title: 'To pay' }],
  [ROUTES.REPORT, ReportScreen, { headerShown: false }],
  [ROUTES.SETTINGS, SettingsScreen, { headerShown: false }],
  [ROUTES.PEOPLE, PeopleScreen, { headerShown: false }],
  [ROUTES.MONEY_MONTH, MonthScreen, { headerShown: false }],
  [ROUTES.MONEY_MONTHS, MonthsScreen, { headerShown: false }],
  [ROUTES.MONEY_LENDS, LendsScreen, { headerShown: false }],
  [ROUTES.MONEY_SETTINGS, MoneySettingsScreen, { headerShown: false }],
  [ROUTES.MONEY_REPORT, MoneyReportScreen, { headerShown: false }],
];

export default function AppNavigator() {
  const s = useStyles();
  const { scheme } = useTheme();
  // navigation colours follow the active theme + mode
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: s.screen.backgroundColor,
        card: s.navHeader.backgroundColor,
        text: s.navHeader.color,
        primary: s.palCtaFrom.color,
      },
    };
  }, [scheme, s]);
  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: s.navHeader.backgroundColor },
      headerTintColor: s.navHeader.color,
      headerTitleStyle: { fontWeight: '700' },
      contentStyle: { backgroundColor: s.screen.backgroundColor },
    }),
    [s],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={screenOptions}>
        {SCREENS.map(([name, component, options]) => (
          <Stack.Screen
            key={name}
            name={name}
            component={component}
            options={options}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
