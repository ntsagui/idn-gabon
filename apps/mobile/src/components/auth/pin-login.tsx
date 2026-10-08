import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { ErrorNote } from '@/design/components/list';
import { Keypad, PinDots } from '@/design/components/pin-pad';
import { BIOMETRIC } from '@/lib/biometric-label';

type Props = {
  initials: string;
  title: string;
  subtitle: React.ReactNode;
  /** Appelé quand les 6 chiffres sont saisis ; le champ est vidé ensuite. */
  onComplete: (pin: string) => Promise<void> | void;
  busy?: boolean;
  error?: string | null;
  onClearError?: () => void;
  /** Déverrouillage Face ID local (session déjà ouverte). */
  onFaceId?: () => void;
  /** Connexion par clé d'accès (déconnecté), à la place de Face ID sur la touche du clavier. */
  onPasskey?: () => void;
  /** Lien(s) sous le clavier : « Code PIN oublié ? », « Changer de compte »… */
  links?: { label: string; onPress: () => void }[];
  children?: React.ReactNode;
};

/** Connexion par PIN (prototype « login ») : avatar, PIN 6 chiffres, Face ID. */
export function PinLogin({ initials, title, subtitle, onComplete, busy, error, onClearError, onFaceId, onPasskey, links, children }: Props) {
  const t = useIdnTheme();
  const [pin, setPin] = React.useState('');

  React.useEffect(() => {
    if (error) setPin('');
  }, [error]);

  function digit(d: string) {
    if (busy || pin.length >= 6) return;
    onClearError?.();
    const next = pin + d;
    setPin(next);
    if (next.length === 6) {
      void Promise.resolve(onComplete(next)).finally(() => setPin(''));
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <View style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>{initials}</Text>
        </View>
        <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 22, fontWeight: '600', color: t.ink, textAlign: 'center' }}>{title}</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: t.muted, textAlign: 'center' }}>{subtitle}</Text>
        {busy ? <ActivityIndicator color={t.green} style={{ marginTop: 28, height: 14 }} /> : <PinDots filled={pin.length} error={!!error} />}
        <View style={{ alignSelf: 'stretch' }}>
          <ErrorNote>{error}</ErrorNote>
        </View>
        {children}
      </View>
      <Keypad
        onDigit={digit}
        onDelete={() => setPin((v) => v.slice(0, -1))}
        disabled={busy}
        leftAction={
          onFaceId
            ? { icon: 'scanFace', label: `Déverrouiller avec ${BIOMETRIC}`, onPress: onFaceId }
            : onPasskey
              ? { icon: 'keyRound', label: 'Se connecter avec une clé d’accès', onPress: onPasskey }
              : undefined
        }
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, paddingTop: 14, paddingBottom: 8 }}>
        {links?.map((l) => (
          <Pressable key={l.label} onPress={l.onPress} hitSlop={8} accessibilityRole="button">
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.greenText }}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
