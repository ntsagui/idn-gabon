import { Stack } from 'expo-router';
import { IBoiteActiveAccountProvider } from '@/lib/iboite-active-account';

export default function IBoiteLayout() {
  return (
    <IBoiteActiveAccountProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="courrier/[id]" />
      <Stack.Screen name="email/[id]" />
      {/* Les feuilles (`formSheet`) présentées depuis une pile imbriquée dans
          les onglets s'affichent vides avec react-native-screens : la saisie
          s'ouvre donc en écran plein, avec sa propre barre de titre. */}
      <Stack.Screen name="compose" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="address-setup" />
      <Stack.Screen name="courrier/compose" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
    </IBoiteActiveAccountProvider>
  );
}
