import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import RoleSelector from '../screens/RoleSelector';
import MeseroLogin from '../screens/MeseroLogin';
import MeseroHome from '../screens/MeseroHome';
import BartenderLogin from '../screens/BartenderLogin';
import BartenderHome from '../screens/BartenderHome';
import AdminLogin from '../screens/AdminLogin';
import AdminHome from '../screens/AdminHome';

export type { RootStackParamList };
export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: '#0A0A0F' },
        }}
      >
        <Stack.Screen name="RoleSelector" component={RoleSelector} />
        <Stack.Screen name="MeseroLogin" component={MeseroLogin} />
        <Stack.Screen name="MeseroHome" component={MeseroHome} />
        <Stack.Screen name="BartenderLogin" component={BartenderLogin} />
        <Stack.Screen name="BartenderHome" component={BartenderHome} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
        <Stack.Screen name="AdminHome" component={AdminHome} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
