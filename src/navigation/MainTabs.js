/**
 * The app's first screen: bottom tabs Work (catering Home, as before) and
 * Money (bank accounts, salary months). Every other screen is pushed on
 * the stack above the tabs (AppNavigator), so the tab bar hides there.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { mdiBriefcaseVariant, mdiWallet } from '@mdi/js';
import { BottomTabBar } from '@/components/kit';
import HomeScreen from '@/screens/caterings/HomeScreen';
import MoneyHomeScreen from '@/screens/money/MoneyHomeScreen';
import { ROUTES } from './routes';

const Tab = createBottomTabNavigator();

const renderTabBar = props => <BottomTabBar {...props} />;

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      backBehavior="firstRoute"
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name={ROUTES.TAB_WORK}
        component={HomeScreen}
        options={{ tabBarLabel: 'Work', tabIconPath: mdiBriefcaseVariant }}
      />
      <Tab.Screen
        name={ROUTES.TAB_MONEY}
        component={MoneyHomeScreen}
        options={{ tabBarLabel: 'Money', tabIconPath: mdiWallet }}
      />
    </Tab.Navigator>
  );
}
