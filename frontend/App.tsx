import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Silkscreen_400Regular } from '@expo-google-fonts/silkscreen';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    Silkscreen_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}
