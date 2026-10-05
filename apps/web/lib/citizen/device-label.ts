// Copie de apps/mobile/src/lib/device-label.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Libellé d'appareil d'une session. Le backend en propose un, lu comme un
 * user-agent de navigateur ; or l'app native signe ses requêtes autrement
 * (iOS : « <App>/<build> CFNetwork/… Darwin/… », Android : « okhttp/… »),
 * ce qui donnait « Appareil · Navigateur ».
 */
export function deviceLabel(device: string, userAgent: string | null): string {
  if (userAgent && /CFNetwork\//.test(userAgent) && /Darwin\//.test(userAgent)) return 'iPhone · App IDN';
  if (userAgent && /^okhttp\//i.test(userAgent)) return 'Android · App IDN';
  return device;
}
