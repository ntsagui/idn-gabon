import { Tabs } from 'expo-router';
import { NTabBar } from '@/components/chrome/tab-bar';

/** Navigation principale : 4 onglets (le Scanner est dans l'en-tête de l'Accueil). */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="icarte" />
      <Tabs.Screen name="iboite" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
