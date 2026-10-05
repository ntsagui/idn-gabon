import { Stack } from 'expo-router';

/**
 * iDocument : stack simple, sans coffre-fort. Le chiffrement E2E client
 * (VaultGate / use-vault) reste disponible dans le code mais n'enveloppe
 * plus iDoc — les fichiers sont stockés en clair côté serveur (Convex
 * storage) et l'accès est gardé par l'auth + ownership.
 */
export default function IDocLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="folder/[id]" />
      {/* Écran poussé (et non formSheet) : les feuilles présentées depuis une pile imbriquée s'affichaient vides. */}
      <Stack.Screen name="preview/[id]" />
      <Stack.Screen name="add" />
      <Stack.Screen name="add-success" />
    </Stack>
  );
}
