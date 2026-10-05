import { Stack } from 'expo-router';

export default function ICarteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add" />
      <Stack.Screen name="custom" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="add-template" />
    </Stack>
  );
}
