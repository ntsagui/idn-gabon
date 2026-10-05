/**
 * Une requête Convex rejetée parce que la session n'est plus valide (session
 * révoquée depuis un autre appareil, compte programmé pour suppression…) :
 * le jeton local paraît encore bon, mais le serveur répond UNAUTHENTICATED.
 */
export function isSessionExpiredError(error: unknown): boolean {
  const data = (error as { data?: { code?: string } } | null)?.data;
  if (data?.code === 'UNAUTHENTICATED') return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /"code":"UNAUTHENTICATED"|UNAUTHENTICATED/.test(message);
}
