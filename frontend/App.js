import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/index';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0a0a0a" />
      <RootNavigator />
    </AuthProvider>
  );
}
