import React from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

/**
 * Typographie de la charte : IBM Plex Sans pour le texte, IBM Plex Mono pour
 * les identifiants (NIP, adresses @idn.ga, références). Les polices sont
 * embarquées (plugin expo-font) et chargées au démarrage (`useIdnFonts`).
 *
 * React Native ne sait pas choisir une graisse dans une famille chargée à la
 * main : on traduit donc `fontWeight` vers la fonte exacte (nom PostScript).
 * Tout le code importe `Text` / `TextInput` d'ici plutôt que de react-native.
 */

export const IDN_FONTS = {
  'IBMPlexSans-Regular': require('../../assets/fonts/IBMPlexSans-Regular.ttf'),
  'IBMPlexSans-Medium': require('../../assets/fonts/IBMPlexSans-Medium.ttf'),
  'IBMPlexSans-SemiBold': require('../../assets/fonts/IBMPlexSans-SemiBold.ttf'),
  'IBMPlexSans-Bold': require('../../assets/fonts/IBMPlexSans-Bold.ttf'),
  'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
  'IBMPlexMono-Medium': require('../../assets/fonts/IBMPlexMono-Medium.ttf'),
  'IBMPlexMono-SemiBold': require('../../assets/fonts/IBMPlexMono-SemiBold.ttf'),
} as const;

type Weight = 'Regular' | 'Medium' | 'SemiBold' | 'Bold';

function weightName(fontWeight: TextStyle['fontWeight']): Weight {
  const w = fontWeight === 'bold' ? 700 : fontWeight === 'normal' || fontWeight == null ? 400 : Number(fontWeight);
  if (w >= 700) return 'Bold';
  if (w >= 600) return 'SemiBold';
  if (w >= 500) return 'Medium';
  return 'Regular';
}

function isMono(family: string | undefined): boolean {
  return !!family && (family.startsWith('IBMPlexMono') || family === 'Menlo' || family === 'monospace' || family === 'Courier');
}

/** Résout la fonte IBM Plex correspondant au style donné. */
export function plexStyle(style: TextProps['style']): TextStyle {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const family = flat.fontFamily;
  // Une famille explicite qui n'est ni Plex ni mono système est respectée telle quelle.
  if (family && !family.startsWith('IBMPlex') && !isMono(family)) return {};
  const weight = weightName(flat.fontWeight);
  const fontFamily = isMono(family)
    ? `IBMPlexMono-${weight === 'Bold' ? 'SemiBold' : weight}`
    : `IBMPlexSans-${weight}`;
  // La fonte porte déjà sa graisse : laisser `fontWeight` ferait chercher à
  // iOS une graisse voisine dans la famille, et Android ajouterait un faux gras.
  return { fontFamily, fontWeight: Platform.OS === 'android' ? 'normal' : undefined };
}

export const Text = React.forwardRef<RNText, TextProps>(function IdnText({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[style, plexStyle(style)]} />;
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function IdnTextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[style, plexStyle(style)]} />;
});
