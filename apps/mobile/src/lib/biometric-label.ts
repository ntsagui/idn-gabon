import { Platform } from 'react-native';

/**
 * Nom de la biométrie selon le système : « Face ID » n'existe que sur iPhone ;
 * sur Android on parle d'empreinte ou de reconnaissance faciale, d'où un terme
 * générique.
 */
export const BIOMETRIC = Platform.OS === 'ios' ? 'Face ID' : 'la biométrie';
/** Variante en début de phrase ou en titre. */
export const BIOMETRIC_TITLE = Platform.OS === 'ios' ? 'Face ID' : 'Biométrie';
