import React from 'react';
import { View } from 'react-native';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { authClient } from '@/lib/auth-client';
import { isSessionExpiredError } from '@/lib/auth-errors';

/**
 * Filet de sécurité de toute l'app. Une session fermée côté serveur ne doit
 * jamais finir sur l'écran d'erreur rouge : on ferme la session locale et on
 * renvoie vers la connexion. Toute autre erreur propose de réessayer.
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useIdnTheme();
  const expired = isSessionExpiredError(error);
  const [busy, setBusy] = React.useState(false);

  async function reconnect() {
    setBusy(true);
    try {
      await authClient.signOut();
    } catch {
      // La session est déjà invalide côté serveur : on poursuit.
    }
    await retry();
    router.replace('/(auth)/login');
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <IdnLottie name="shield" size={110} />
      <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
        {expired ? 'Ta session a été fermée' : 'Une erreur est survenue'}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center', maxWidth: 320 }}>
        {expired
          ? 'Elle a été fermée depuis un autre appareil ou par une opération sur ton compte. Reconnecte-toi avec ton code PIN.'
          : 'L’écran n’a pas pu s’afficher. Réessaie ; si le problème persiste, contacte le support.'}
      </Text>
      <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
        <IdnButton t={t} full onPress={expired ? reconnect : retry} loading={busy}>
          {expired ? 'Me reconnecter' : 'Réessayer'}
        </IdnButton>
      </View>
    </View>
  );
}
