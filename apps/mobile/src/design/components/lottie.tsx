import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReduceMotion } from '@/design/motion';

/** Animations de la charte, générées par apps/web/scripts/brand-lottie.mjs. */
const SOURCES = {
  'logo-reveal': require('../../../assets/lottie/logo-reveal.json'),
  loader: require('../../../assets/lottie/loader.json'),
  success: require('../../../assets/lottie/success.json'),
  scan: require('../../../assets/lottie/scan.json'),
  shield: require('../../../assets/lottie/shield.json'),
  biometric: require('../../../assets/lottie/biometric.json'),
  iboite: require('../../../assets/lottie/iboite.json'),
  icarte: require('../../../assets/lottie/icarte.json'),
  idocument: require('../../../assets/lottie/idocument.json'),
  notification: require('../../../assets/lottie/notification.json'),
  partage: require('../../../assets/lottie/partage.json'),
  icv: require('../../../assets/lottie/icv.json'),
} as const;

export type LottieName = keyof typeof SOURCES;

type Props = {
  name: LottieName;
  size: number;
  loop?: boolean;
  /** Texte alternatif ; absent = animation décorative masquée aux lecteurs d'écran. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  onFinish?: () => void;
};

/**
 * Lottie qui respecte « Réduire les animations » : l'image finale est
 * affichée figée (et `onFinish` part tout de suite) au lieu de l'animation.
 */
export function IdnLottie({ name, size, loop = false, label, style, onFinish }: Props) {
  const reduce = useReduceMotion();
  React.useEffect(() => {
    if (reduce && onFinish) onFinish();
  }, [reduce, onFinish]);
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {reduce ? (
        <LottieView source={SOURCES[name]} progress={loop ? 0.5 : 1} style={{ width: size, height: size }} />
      ) : (
        <LottieView source={SOURCES[name]} autoPlay loop={loop} onAnimationFinish={onFinish} style={{ width: size, height: size }} />
      )}
    </View>
  );
}
