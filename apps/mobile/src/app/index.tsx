import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useConvexAuth } from 'convex/react';
import { Text } from '@/design/text';
import { idnTokens } from '@/design/tokens';
import { IdnFlagBars } from '@/design/mark';
import { IdnLottie } from '@/design/components/lottie';

// Le lancement animé ne se joue qu'une fois par démarrage à froid.
let splashPlayed = false;

/**
 * Lancement (prototype « splash ») : sceau animé sur fond vert sombre, puis
 * aiguillage — session ouverte → verrou PIN / Face ID, sinon → bienvenue.
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [animationDone, setAnimationDone] = React.useState(splashPlayed);

  React.useEffect(() => {
    if (animationDone) return;
    // Filet de sécurité : 2,6 s comme le prototype, même si l'animation ne finit pas.
    const timer = setTimeout(() => setAnimationDone(true), 2600);
    return () => clearTimeout(timer);
  }, [animationDone]);

  React.useEffect(() => {
    if (!animationDone || isLoading) return;
    splashPlayed = true;
    router.replace(isAuthenticated ? '/launcher' : '/(auth)/hub');
  }, [animationDone, isAuthenticated, isLoading]);

  const finish = React.useCallback(() => setAnimationDone(true), []);

  return (
    <View style={{ flex: 1, backgroundColor: idnTokens.greenDk, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="light" />
      <IdnLottie name="logo-reveal" size={160} label="Apparition du logo IDN" onFinish={finish} />
      <Text style={{ marginTop: 16, fontSize: 24, fontWeight: '600', color: '#fff', letterSpacing: -0.24 }}>Identité Numérique</Text>
      <Text style={{ marginTop: 4, fontFamily: idnTokens.mono, fontSize: 11, letterSpacing: 1.5, color: '#D9EADF', textTransform: 'uppercase' }}>République gabonaise</Text>
      <View style={{ marginTop: 24 }}>
        <IdnFlagBars width={42} height={3} />
      </View>
      <Pressable
        onPress={finish}
        accessibilityRole="button"
        style={{ position: 'absolute', bottom: 56, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 9999, paddingVertical: 10, paddingHorizontal: 20 }}
      >
        <Text style={{ color: '#fff', fontSize: 14 }}>Passer</Text>
      </Pressable>
    </View>
  );
}
