import React from 'react';
import { useRouter } from 'expo-router';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Stepper } from '@/design/components/stepper';
import { BIOMETRIC_TITLE } from '@/lib/biometric-label';

/**
 * Étapes réelles de l'inscription : l'adresse @idn.ga doit être réservée
 * avant le PIN, car c'est le PIN qui ouvre le compte (cf. signup/pin.tsx).
 */
export const SIGNUP_STEPS = ['Identité', 'Adresse', 'PIN', BIOMETRIC_TITLE];

type Props = {
  step: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  keyboard?: boolean;
  scroll?: boolean;
};

/** Gabarit commun des étapes d'inscription (AppBar « Créer mon compte » + stepper). */
export function SignupScreen({ step, children, footer, onBack, keyboard, scroll }: Props) {
  const router = useRouter();
  return (
    <Screen
      keyboard={keyboard}
      scroll={scroll}
      header={<AppBar title="Créer mon compte" onBack={onBack ?? (() => router.back())} />}
      subHeader={<Stepper steps={SIGNUP_STEPS} current={step} />}
      footer={footer}
    >
      {children}
    </Screen>
  );
}
