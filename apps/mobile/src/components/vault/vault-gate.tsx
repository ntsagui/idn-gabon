import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/design/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { Icon } from '@/design/icons';
import { useVault } from '@/hooks/use-vault';

/**
 * VaultGate — wrap iDocument. Affiche un écran d'activation/déverrouillage
 * tant que la MVK n'est pas chargée en mémoire. Une fois déverrouillé,
 * rend les enfants normalement.
 */
export function VaultGate({ children }: { children: React.ReactNode }) {
  const t = useIdnTheme();
  const insets = useSafeAreaInsets();
  const { status, activate, unlock } = useVault();
  const [password, setPassword] = useState('');
  const [hint, setHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status.phase === 'unlocked') return <>{children}</>;

  async function submit() {
    if (submitting) return;
    if (password.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (status.phase === 'inactive') {
        await activate(password, hint || undefined);
      } else if (status.phase === 'locked') {
        await unlock(password);
      }
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec.');
      setSubmitting(false);
    }
  }

  const activating = status.phase === 'inactive';

  if (status.phase === 'loading' || status.phase === 'unauth') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <Text style={{ color: t.muted, fontSize: 13 }}>Chargement du coffre-fort…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 18, marginBottom: 30 }}>
          <View style={{ width: 76, height: 76, borderRadius: 9999, backgroundColor: t.dark ? '#0F2A18' : idnTokens.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={36} color={idnTokens.green} />
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: t.ink, letterSpacing: -0.4 }}>
              {activating ? 'Activer le coffre-fort' : 'Déverrouiller iDocument'}
            </Text>
            <Text style={{ fontSize: 13, color: t.muted, textAlign: 'center', lineHeight: 19, maxWidth: 320 }}>
              {activating
                ? 'Choisissez un mot de passe vault. Il chiffre vos documents de bout en bout — IDN ne peut PAS le récupérer.'
                : 'Saisissez votre mot de passe vault pour accéder à vos documents.'}
            </Text>
            {!activating && status.phase === 'locked' && status.passwordHint ? (
              <Text style={{ fontSize: 12, color: t.muted, marginTop: 4, fontStyle: 'italic' }}>
                Indice : {status.passwordHint}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <IdnInput
            t={t}
            label={activating ? 'Nouveau mot de passe vault' : 'Mot de passe vault'}
            value={password}
            onChangeText={setPassword}
            type="password"
            leadIcon={<Icon name="lock" size={20} color={t.muted} />}
            autoFocus
          />
          {activating ? (
            <IdnInput
              t={t}
              label="Indice (optionnel)"
              placeholder="Ce qui peut vous rappeler ce mot de passe"
              value={hint}
              onChangeText={setHint}
            />
          ) : null}

          {error ? (
            <View style={{ backgroundColor: t.dark ? '#3A1212' : '#FBE5E5', borderRadius: 10, padding: 12 }}>
              <Text style={{ color: '#B83A3A', fontSize: 12, lineHeight: 17 }}>{error}</Text>
            </View>
          ) : null}

          <IdnButton t={t} variant="primary" size="lg" full onPress={submit} disabled={submitting}>
            {submitting
              ? activating
                ? 'Activation en cours…'
                : 'Déverrouillage en cours…'
              : activating
                ? 'Activer'
                : 'Déverrouiller'}
          </IdnButton>
          {submitting ? (
            <Text style={{ fontSize: 11, color: t.muted, textAlign: 'center', marginTop: -4 }}>
              Cela peut prendre quelques secondes — l’app reste réactive.
            </Text>
          ) : null}

          {activating ? (
            <Pressable style={{ paddingVertical: 8 }}>
              <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                IDN n’a aucun accès à votre mot de passe ni à vos documents. En cas de perte, ils sont irrécupérables.
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
