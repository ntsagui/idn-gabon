// Copie de apps/mobile/src/lib/wallet-order.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
export function moveItem<T>(
  items: readonly T[],
  index: number,
  direction: -1 | 1,
): T[] {
  const target = index + direction
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  )
    return [...items]
  const next = [...items]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}
